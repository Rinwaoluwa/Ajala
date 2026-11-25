import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import { ScrollView, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import {
  Host,
  GlassSurface,
  NativeIcon,
  NativeSpinner,
  Text,
  TextField,
  TextLink,
  formatDistance,
  icons,
} from '@shared/components';
import { searchFocus } from '@shared/components/form/searchFocus';
import { useDebouncedValue } from '@shared/hooks/useDebouncedValue';
import { useLiquidGlass } from '@shared/hooks/useLiquidGlass';
import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER } from '@shared/theme';
import { useTypeColors } from '@shared/theme/postTypeColors';

import type { ListedPost, PlaceLocation, PlaceResult } from '../../domain/entities/Explore';
import { SEARCH_MAX, SEARCH_MIN } from '../../domain/rules/exploreRules';
import { exploreCopy, exploreErrorMessages, typeEmoji, typeLabels } from '../copy';
import { formatWeekdayTime } from '../format';
import { usePlaceSearch } from '../hooks/usePlaceSearch';
import { useSearchPosts } from '../hooks/useSearchPosts';
import { MapButton } from './MapButton';

/**
 * The top of the map: "Search activities..." and the filter button beside it.
 *
 * The field is typed in here, on the map, and the keyboard's Search key runs
 * the search: the Explore list (the drawer) opens with the words in its own
 * box and what they find listed (`onSeeAll`; product, 24 Nov). The field is
 * emptied as it hands over: the search carries on in the list, and the map's
 * pins are not narrowed by it. One character is not enough to search for
 * (spec §2.18); it is handed over all the same, and the list asks for more.
 * Nothing typed, nothing happens.
 *
 * Nothing is asked of the server while typing, which is how the API's search
 * is meant to be used ("runs on submit; no typeahead").
 *
 * A touch anywhere else puts the keyboard away (`searchFocus`).
 *
 * `children` is what sits under the field (the interest chips, the status line).
 *
 * Kept, switched off (`RESULTS_HERE`), is what the field did the day before:
 *
 *   - Typing found activities. Two letters or more, and once typing paused
 *     (350ms), the ones that matched (`GET /search/posts?q=`, within 30 km of
 *     where the feed looks) were listed in a card under the field, laid over
 *     `children` so nothing moved: a picture or the type's mark, the title,
 *     then what kind it is, when and where.
 *   - Choosing one showed it on the map (`onShowPost`). "See all results"
 *     handed the search to the list, as the Search key does. Nothing found
 *     said how far search looks.
 *   - The card was there while the field was being typed in; a touch anywhere
 *     else put the keyboard away and the card with it.
 *   - It asked as the person typed (backend request B17): only after a pause,
 *     never per letter.
 *   - Cities could be listed in the same card (`SUGGESTIONS_ENABLED`). People
 *     could too, until the people search left Explore (product, 25 Nov).
 *
 * While it is off none of that runs: the searches are given nothing to look
 * for, so nothing is asked of the server or of Google. Set `RESULTS_HERE` to
 * true to bring the card back.
 */
const RESULTS_HERE = false;
/** With `RESULTS_HERE`: cities (moving the map to the one chosen), under the activities. */
const SUGGESTIONS_ENABLED = false;
const ACTIVITIES_SHOWN = 5;
const PAUSE_MS = 350;
const THUMB = 40;

export function MapSearchBar({
  onShowPost,
  onSeeAll,
  onChoose,
  onOpenFilters,
  filtersActive,
  children,
}: {
  /** What sits under the field; with `RESULTS_HERE`, the results are laid over it. */
  children?: ReactNode;
  /** With `RESULTS_HERE`, an activity chosen from the results: show it on the map. */
  onShowPost: (post: ListedPost) => void;
  /** The search run (the Search key): open the Explore list on these words. */
  onSeeAll: (words: string) => void;
  onChoose: (location: PlaceLocation) => void;
  onOpenFilters: () => void;
  filtersActive: boolean;
}) {
  const theme = useTheme();
  const glass = useLiquidGlass();
  const window = useWindowDimensions();
  const copy = exploreCopy.map;
  const [text, setText] = useState('');
  // Remounting the uncontrolled field is how it is emptied, and how its keyboard is put away.
  const [fieldKey, setFieldKey] = useState(0);
  // Being typed in: the results show only then.
  const [typing, setTyping] = useState(false);

  // With `RESULTS_HERE`, what to look for: what is in the field once typing has paused.
  // (Nothing, while it is off: every search below is then given nothing to ask for.)
  const words = useDebouncedValue(RESULTS_HERE ? text.trim() : '', PAUSE_MS);
  const ready = words.length >= SEARCH_MIN;
  const found = useSearchPosts(ready ? words : null);
  const activities = found.items.slice(0, ACTIVITIES_SHOWN);
  const more = found.items.length > ACTIVITIES_SHOWN || found.hasMore;

  // Off: the hook is given nothing to look for, so it asks nothing.
  const search = usePlaceSearch(RESULTS_HERE && SUGGESTIONS_ENABLED ? text : '');
  const placesFailed = search.failed || search.locateFailed;

  /** The keyboard away and the results with it; the words stay in the field. */
  const leave = () => {
    setTyping(false);
    setFieldKey((k) => k + 1);
  };
  const clear = () => {
    setText('');
    leave();
  };

  const show = (post: ListedPost) => {
    leave();
    onShowPost(post);
  };
  /**
   * The search goes to the Explore list, which opens on what `forWords` find. (One character
   * goes too: the list puts it in its box and asks for more.) Nothing typed, nothing to hand over.
   */
  const seeAll = (forWords: string) => {
    if (!forWords) return;
    // The search carries on in the list: this field starts clean when it is come back to.
    clear();
    onSeeAll(forWords);
  };
  const choosePlace = async (place: PlaceResult) => {
    if (search.locating) return;
    const location = await search.locate(place.placeId);
    if (!location) return;
    clear();
    onChoose(location);
  };

  const busy = (ready && found.loading) || search.searching || search.locating;
  // With `RESULTS_HERE`: open while typing, once there are words to look for. Emptied or cut
  // short, it closes at once rather than when the pause is up.
  const open = RESULTS_HERE && typing && ready && text.trim().length >= SEARCH_MIN;

  return (
    // The whole height the screen gives it, taking no touches of its own: the results are then
    // inside its bounds (a touch outside a view's bounds does not reach it on Android).
    <View pointerEvents="box-none" style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: SCREEN_GUTTER }}>
        {/* Glass where the phone has it; otherwise the design's card holding the pale field. */}
        <GlassSurface fallbackColor={theme.card} style={{ flex: 1, borderRadius: glass ? 12 : 8 }}>
          <TextField
            key={fieldKey}
            label={copy.searchPlaceholder}
            labelHidden
            filled={!glass}
            bare={glass}
            placeholder={copy.searchPlaceholder}
            defaultValue={text}
            onChangeText={(next) => {
              search.resetLocate();
              setText(next);
            }}
            onFocus={() => setTyping(true)}
            onBlur={() => setTyping(false)}
            maxLength={SEARCH_MAX}
            autoCorrect={false}
            returnKeyType="search"
            // The Search key: the list opens on the words and what they find.
            onSubmitEditing={() => seeAll(text.trim())}
            clearable
            leading={<NativeIcon source={icons.search} size={16} color={theme.muted} />}
            trailing={busy ? <NativeSpinner size={14} color={theme.muted} /> : undefined}
            testID="map-search"
          />
        </GlassSurface>
        <MapButton
          icon={icons.filter}
          accessibilityLabel={filtersActive ? copy.filtersActive : copy.filters}
          onPress={onOpenFilters}
          badge={filtersActive}
        />
      </View>
      <View pointerEvents="box-none" style={{ flex: 1 }}>
        {children}
        {open ? (
          <Animated.View
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(150)}
            // A touch on the results counts as a touch on the field: the keyboard stays, and
            // the row under the finger is still there to take the tap.
            onTouchStart={searchFocus.markFieldTouch}
            style={{
              position: 'absolute',
              top: 6,
              left: SCREEN_GUTTER,
              right: SCREEN_GUTTER,
              borderRadius: 12,
              backgroundColor: theme.card,
              shadowColor: '#000',
              shadowOpacity: 0.12,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            }}
          >
            {/* As tall as its rows, up to what fits over the keyboard; past that it scrolls. */}
            <ScrollView
              style={{ maxHeight: Math.round(window.height * 0.42) }}
              contentContainerStyle={{ paddingVertical: 4 }}
              keyboardShouldPersistTaps="always"
              bounces={false}
              showsVerticalScrollIndicator={false}
            >
              <SectionHeading label={copy.activitiesHeading} />
              {found.loading ? (
                <Busy label={copy.searching} />
              ) : found.error ? (
                <View style={[ROW, { flexWrap: 'wrap' }]}>
                  <Text variant="bodySm" tone="muted" style={{ flexShrink: 1 }} accessibilityLiveRegion="polite">
                    {found.error === 'noLocation' ? exploreErrorMessages.noLocation : copy.activitiesFailed}
                  </Text>
                  <TextLink label={copy.retrySearch} onPress={found.retry} emphasis="plain" />
                </View>
              ) : activities.length === 0 ? (
                <Note text={copy.noActivities(words)} live />
              ) : (
                <>
                  {activities.map((post) => (
                    <ActivityRow key={post.id} post={post} onPress={() => show(post)} />
                  ))}
                  {more ? <LinkRow label={copy.seeAllResults} onPress={() => seeAll(words)} /> : null}
                </>
              )}

              {SUGGESTIONS_ENABLED ? (
                <>
                  <Divider />
                  <SectionHeading label={copy.placesHeading} />
                  {search.searching && !placesFailed ? (
                    <Busy />
                  ) : placesFailed ? (
                    <Note text={copy.placesFailed} live />
                  ) : search.places.length === 0 ? (
                    <Note text={copy.noPlaces} />
                  ) : (
                    search.places.map((place) => (
                      <TouchableOpacity
                        activeOpacity={0.6}
                        key={place.placeId}
                        onPress={() => void choosePlace(place)}
                        accessibilityRole="button"
                        accessibilityLabel={[place.name, place.detail].filter(Boolean).join(', ')}
                        style={ROW}
                      >
                        <Glyph>
                          <NativeIcon source={icons.location} size={14} color={theme.muted} />
                        </Glyph>
                        <Text variant="bodySm" className="flex-1" numberOfLines={2}>
                          {place.name}
                          {place.detail ? <Text variant="bodySm" tone="muted">{`, ${place.detail}`}</Text> : null}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}

                </>
              ) : null}
            </ScrollView>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

const ROW = {
  minHeight: 44,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  paddingHorizontal: 16,
  paddingVertical: 8,
} as const;

/**
 * One activity found: its picture (or its type's mark on the type's colour when
 * it has none), its title on up to two lines, then one quieter line: what kind
 * it is, when and where, with how far it is at the end. The place is what gives
 * way when the line is short of room; the card that comes up has it in full.
 */
function ActivityRow({ post, onPress }: { post: ListedPost; onPress: () => void }) {
  const theme = useTheme();
  const typeColors = useTypeColors();
  const detail = [typeLabels[post.type], formatWeekdayTime(post.startAt), post.placeName].filter(Boolean).join(' · ');
  const distance = formatDistance(post.distanceKm);
  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[post.title, detail, distance].filter(Boolean).join(', ')}
      accessibilityHint={exploreCopy.map.showOnMap}
      style={[ROW, { gap: 12 }]}
    >
      <View
        style={{
          width: THUMB,
          height: THUMB,
          borderRadius: 10,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: post.imageUrl ? theme.skeleton : typeColors[post.type].soft,
        }}
      >
        {post.imageUrl ? (
          <Image source={{ uri: post.imageUrl }} style={{ width: THUMB, height: THUMB }} contentFit="cover" />
        ) : (
          <Text variant="bodyMd" importantForAccessibility="no" accessibilityElementsHidden>
            {typeEmoji[post.type]}
          </Text>
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodySm" numberOfLines={2}>
          {post.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text variant="bodyXs" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
            {detail}
          </Text>
          {distance ? (
            <Text variant="bodyXs" tone="muted">
              {distance}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

/** A row that leads on from the results: "See all results". */
function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <View style={[ROW, { minHeight: 40 }]}>
      <TextLink label={label} onPress={onPress} emphasis="plain" />
    </View>
  );
}

function Divider() {
  const theme = useTheme();
  return <View style={{ height: 1, marginHorizontal: 16, marginVertical: 4, backgroundColor: theme.border }} />;
}

/** A native glyph at the head of a row. */
function Glyph({ children }: { children: ReactNode }) {
  return (
    <Host matchContents pointerEvents="none" ignoreSafeArea="all">
      {children}
    </Host>
  );
}

function SectionHeading({ label }: { label: string }) {
  return (
    <Text variant="labelXs" tone="muted" className="px-16 pt-8 pb-2" accessibilityRole="header">
      {label}
    </Text>
  );
}

function Note({ text, live = false }: { text: string; live?: boolean }) {
  return (
    <Text variant="bodySm" tone="muted" className="px-16 py-8" accessibilityLiveRegion={live ? 'polite' : undefined}>
      {text}
    </Text>
  );
}

function Busy({ label }: { label?: string }) {
  const theme = useTheme();
  return (
    <View
      accessible={!!label}
      accessibilityRole={label ? 'progressbar' : undefined}
      accessibilityLabel={label}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10 }}
    >
      <Host matchContents>
        <NativeSpinner size={14} color={theme.muted} />
      </Host>
      {label ? (
        <Text variant="bodySm" tone="muted">
          {label}
        </Text>
      ) : null}
    </View>
  );
}
