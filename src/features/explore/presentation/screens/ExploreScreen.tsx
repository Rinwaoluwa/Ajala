import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Host } from '@expo/ui';

import { getCurrentCoordinates } from '@core/location/deviceLocation';
import {
  MapCanvas,
  MapPin,
  regionAround,
  regionToBbox,
  type MapCanvasHandle,
  type MapKind,
  type MapRegion,
} from '@core/maps';
import { GlassSurface, LoadingRing, NativeIcon, StatusSheet, Text, icons } from '@shared/components';
import { useLiquidGlass } from '@shared/hooks/useLiquidGlass';
import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER } from '@shared/theme';

import type { Bbox, PlaceResult, PostPreview, PostType } from '../../domain/entities/Explore';
import type { ReportReasonKey, RsvpAction } from '../../domain/rules/exploreRules';
import { FilterSheet } from '../components/FilterSheet';
import { ExploreListSheet } from '../components/ExploreListSheet';
import { MapButton } from '../components/MapButton';
import { MapSearchBar } from '../components/MapSearchBar';
import { MiniPostCard, miniCardEntering, miniCardExiting } from '../components/MiniPostCard';
import { PinMarker } from '../components/PinMarker';
import { ReportActivityDialog } from '../components/ReportActivityDialog';
import { RsvpNoticeDialog } from '../components/RsvpNoticeDialog';
import { TypeChips } from '../components/TypeChips';
import { exploreCopy, exploreErrorMessages, typeLabels } from '../copy';
import { useJoinPost } from '../hooks/useJoinPost';
import { useMapPins } from '../hooks/useMapPins';
import { usePostPreview } from '../hooks/usePostPreview';
import { useReportPost } from '../hooks/useReportPost';
import { useRsvpNotice } from '../hooks/useRsvpNotice';

/**
 * The Explore tab (Figma Explore map, light and dark; API map §7): the map of
 * the feed's city, full screen under the tab bar, with its pins.
 *
 * Over it: the city search and the filter button, the type chips, the map
 * controls on the right (locate me, map style, "Happening today"), and View List,
 * which opens the Explore sheet. Tapping a pin opens its mini card above the tab
 * bar; joining from it shows "Before you RSVP" the first time.
 *
 * The map starts where the phone is (location is required to use the app); pins
 * load for the box the map settles on.
 */

/** The tab bar's top edge, as `FloatingTabBar` places it. */
/** How far above the dock the map controls sit: clear of a mini card at the default text size. */
const CONTROLS_LIFT = 168;

const tabBarTop = (insetBottom: number) => Math.max(insetBottom - 10, 8) + 92;
/** Used only if the phone cannot say where it is: the whole map, nothing loaded. */
const WORLD: MapRegion = regionAround(0, 0, 60);

export type ExploreScreenProps = {
  onOpenPost: (postId: string) => void;
};

export function ExploreScreen({ onOpenPost }: ExploreScreenProps) {
  const glass = useLiquidGlass();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const map = useRef<MapCanvasHandle>(null);

  const [initialRegion, setInitialRegion] = useState<MapRegion | null>(null);
  const [bbox, setBbox] = useState<Bbox | null>(null);
  const [type, setType] = useState<PostType | null>(null);
  const [todayOnly, setTodayOnly] = useState(false);
  const [kind, setKind] = useState<MapKind>('standard');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [noticeFor, setNoticeFor] = useState<PostPreview | null>(null);
  const [reportFor, setReportFor] = useState<string | null>(null);
  const [reportSent, setReportSent] = useState(false);

  const pins = useMapPins(bbox, type, todayOnly);
  const preview = usePostPreview(selectedId);
  const joining = useJoinPost();
  const notice = useRsvpNotice();
  const report = useReportPost();

  useEffect(() => {
    let live = true;
    void getCurrentCoordinates().then((at) => {
      if (!live) return;
      const region = at ? regionAround(at.lat, at.lng) : WORLD;
      setInitialRegion(region);
      setBbox(at ? regionToBbox(region) : null);
    });
    return () => {
      live = false;
    };
  }, []);

  const settle = useCallback((region: MapRegion) => setBbox(regionToBbox(region)), []);

  const locate = async () => {
    const at = await getCurrentCoordinates();
    if (at) map.current?.animateTo(regionAround(at.lat, at.lng));
    pins.retry();
  };

  const goTo = (place: PlaceResult) => map.current?.animateTo(regionAround(place.lat, place.lng, 0.15), 600);

  const select = (id: string | null) => {
    joining.reset();
    setSelectedId(id);
  };

  const join = (post: PostPreview, action: RsvpAction) => {
    if (action.kind === 'book') return joining.book(post);
    if (action.kind !== 'join') return;
    if (!notice.seen) return setNoticeFor(post);
    joining.join(post);
  };

  // The card's ⋯ is a menu with "Report activity" (native on iOS); choosing it lands here.
  const reportPost = (postId: string) => {
    report.reset();
    setReportFor(postId);
  };

  const submitReport = async (keys: ReportReasonKey[], details: string) => {
    if (!reportFor) return;
    try {
      await report.submit({ postId: reportFor, keys, details });
      setReportFor(null);
      setReportSent(true);
    } catch {
      // Shown under the details box by `report.error`.
    }
  };

  const bottom = tabBarTop(insets.bottom) + 12;
  const [dockHeight, setDockHeight] = useState(0);
  const status = pins.error
    ? `${pins.error === 'noCity' ? exploreErrorMessages.noCity : exploreCopy.map.loadFailed}`
    : pins.loaded && !pins.fetching && pins.pins.length === 0
      ? todayOnly
        ? exploreCopy.map.emptyToday
        : exploreCopy.map.empty
      : null;

  return (
    <View className="flex-1 bg-background">
      {initialRegion ? (
        <Animated.View entering={FadeIn.duration(250)} style={{ flex: 1 }}>
          <MapCanvas
            ref={map}
            initialRegion={initialRegion}
            kind={kind}
            showsUserLocation
            padding={{ top: insets.top + 110, right: 0, bottom, left: 0 }}
            onRegionSettled={settle}
            onPressMap={() => select(null)}
          >
            {pins.pins.map((pin) => (
              <MapPin
                key={pin.id}
                id={pin.id}
                latitude={pin.lat}
                longitude={pin.lng}
                version={selectedId === pin.id ? 'on' : 'off'}
                accessibilityLabel={`${typeLabels[pin.type]}: ${pin.title}`}
                onPress={() => select(pin.id)}
              >
                <PinMarker pin={pin} selected={selectedId === pin.id} />
              </MapPin>
            ))}
          </MapCanvas>
        </Animated.View>
      ) : (
        <View className="flex-1 items-center justify-center">
          <LoadingRing size={48} accessibilityLabel="Loading the map" />
        </View>
      )}

      {/* Search, filter and type chips. */}
      <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 8, left: 0, right: 0 }}>
        <View style={{ paddingHorizontal: SCREEN_GUTTER }}>
          <MapSearchBar
            onChoose={goTo}
            onOpenFilters={() => setFiltersOpen(true)}
            filtersActive={type !== null || todayOnly}
          />
        </View>
        <View className="mt-10">
          <TypeChips value={type} onChange={setType} />
        </View>
        {status ? (
          <Animated.View
            // Glass materialises by itself; a fade would make it blink (see GlassSurface).
            entering={glass ? undefined : FadeIn.duration(200)}
            exiting={glass ? undefined : FadeOut.duration(160)}
            className="mt-10 items-center"
            // Side margins, so a status that wraps at large text stays off the screen edges.
            style={{ paddingHorizontal: SCREEN_GUTTER }}
          >
            <GlassSurface fallbackColor={theme.card} style={{ borderRadius: 999 }}>
              <Pressable
                onPress={pins.error ? pins.retry : undefined}
                disabled={!pins.error}
                accessibilityRole={pins.error ? 'button' : 'text'}
                accessibilityLiveRegion="polite"
                style={{ paddingHorizontal: 14, paddingVertical: 8 }}
              >
                <Text variant="labelSm">
                  {status}
                  {pins.error ? (
                    <Text variant="labelSm" tone="link">{`  ${exploreCopy.map.retry}`}</Text>
                  ) : null}
                </Text>
              </Pressable>
            </GlassSurface>
          </Animated.View>
        ) : null}
      </View>

      {/* Map controls, right side above the card's place. */}
      <View
        pointerEvents="box-none"
        // Above the card's place, or above the card itself when big text makes it taller.
        style={{
          position: 'absolute',
          right: SCREEN_GUTTER,
          bottom: bottom + Math.max(CONTROLS_LIFT, dockHeight + 12),
          gap: 12,
        }}
      >
        <MapButton
          icon={icons.locate}
          accessibilityLabel={exploreCopy.map.locate}
          onPress={() => void locate()}
        />
        <MapButton
          icon={icons.layers}
          accessibilityLabel={kind === 'satellite' ? exploreCopy.map.satelliteOn : exploreCopy.map.layers}
          active={kind === 'satellite'}
          onPress={() => setKind((k) => (k === 'standard' ? 'satellite' : 'standard'))}
        />
        <MapButton
          icon={icons.bolt}
          tone="primary"
          active={todayOnly}
          accessibilityLabel={exploreCopy.map.today}
          onPress={() => setTodayOnly((on) => !on)}
        />
      </View>

      {/* The mini card, or View List when no pin is open. */}
      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', left: SCREEN_GUTTER, right: SCREEN_GUTTER, bottom }}
        onLayout={(e) => setDockHeight(e.nativeEvent.layout.height)}
      >
        {selectedId ? (
          <Animated.View key={selectedId} entering={miniCardEntering} exiting={miniCardExiting}>
            <MiniPostCard
              post={preview.post}
              loading={preview.loading}
              error={preview.error}
              joinError={joining.errorFor === selectedId ? joining.error : null}
              joining={joining.joining}
              onRetry={preview.retry}
              onJoin={join}
              onPreview={() => onOpenPost(selectedId)}
              onReport={() => reportPost(selectedId)}
              onClose={() => select(null)}
            />
          </Animated.View>
        ) : (
          <Animated.View
            entering={glass ? undefined : FadeIn.duration(200)}
            exiting={glass ? undefined : FadeOut.duration(150)}
            style={{ alignSelf: 'flex-start' }}
          >
            <GlassSurface
              fallbackColor={theme.selectedFill}
              tint={glass ? `${theme.selectedFill}CC` : null}
              interactive
              style={{ borderRadius: 999 }}
            >
              <Pressable
                onPress={() => setListOpen(true)}
                accessibilityRole="button"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingHorizontal: 16,
                  minHeight: 44,
                }}
              >
                <Host matchContents pointerEvents="none" ignoreSafeArea="all">
                  <NativeIcon source={icons.list} size={14} color={theme.selectedForeground} />
                </Host>
                <Text variant="labelSm" style={{ color: theme.selectedForeground }}>
                  {exploreCopy.map.viewList}
                </Text>
              </Pressable>
            </GlassSurface>
          </Animated.View>
        )}
      </View>

      <FilterSheet
        isPresented={filtersOpen}
        type={type}
        todayOnly={todayOnly}
        onChangeType={setType}
        onChangeToday={setTodayOnly}
        onDismiss={() => setFiltersOpen(false)}
      />
      <ExploreListSheet
        isPresented={listOpen}
        onDismiss={() => setListOpen(false)}
        onOpenMeetup={(id) => {
          setListOpen(false);
          onOpenPost(id);
        }}
      />
      <RsvpNoticeDialog
        isPresented={noticeFor !== null}
        onDismiss={() => setNoticeFor(null)}
        onAccept={() => {
          const post = noticeFor;
          notice.acknowledge();
          setNoticeFor(null);
          if (post) joining.join(post);
        }}
      />
      <ReportActivityDialog
        isPresented={reportFor !== null}
        submitting={report.submitting}
        error={report.error}
        onSubmit={(keys, details) => void submitReport(keys, details)}
        onDismiss={() => setReportFor(null)}
      />
      <StatusSheet
        isPresented={reportSent}
        tone="success"
        title={exploreCopy.report.sentTitle}
        message={exploreCopy.report.sentBody}
        actionLabel={exploreCopy.report.sentAction}
        onAction={() => setReportSent(false)}
        onDismiss={() => setReportSent(false)}
      />
    </View>
  );
}
