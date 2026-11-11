import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, View, useColorScheme } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  EmptyState,
  LoadingRing,
  NoteCard,
  PillTabs,
  Screen,
  Text,
  VectorIcon,
  enterRise,
  useListEntrance,
} from '@shared/components';
import { haptics } from '@shared/feedback/haptics';
import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER } from '@shared/theme';

import type { TripCard, TripsTab } from '../../domain/entities/Trip';
import { PastTripCard } from '../components/PastTripCard';
import { TripsSkeleton } from '../components/TripsSkeleton';
import { UpcomingTripCard } from '../components/UpcomingTripCard';
import { tripsCopy, tripsErrors } from '../copy';
import { useTripList } from '../hooks/useTripList';

/**
 * The Trips tab (Figma Your trips, light and dark; API map §8): "Your trips",
 * a line that changes with the tab, the Upcoming / Requests / Past pills, then
 * the list.
 *
 *   - Upcoming: posts I'm going to and posts I host that haven't ended, soonest
 *     first, tagged Going or Hosting (`GET /me/rsvps`, `GET /me/posts`).
 *   - Requests: what I'm waiting to get into — private posts I asked to join,
 *     tagged Request sent (`GET /me/rsvps?state=requested`), then posts whose
 *     waitlist I'm on, tagged Waitlisted (`state=waitlisted`) — with the
 *     "Still waiting?" note under them (or under the empty state).
 *   - Past: what I went to (`GET /me/attended`), with the passport note under it.
 *
 * Each list pulls to refresh and loads more near its end; the first cards rise
 * in a short stagger. The line under the title cross-fades with the tab. The
 * list keeps clear of the floating tab bar.
 */

const TAB_BAR_CLEARANCE = 120;

export type TripsScreenProps = {
  onOpenTrip: (id: string) => void;
  onExplore: () => void;
};

export function TripsScreen({ onOpenTrip, onExplore }: TripsScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dark = useColorScheme() === 'dark';
  const [tab, setTab] = useState<TripsTab>('upcoming');
  const list = useTripList(tab);
  const bottom = TAB_BAR_CLEARANCE + insets.bottom;
  // The first cards rise in once per tab, never again as the list re-mounts rows.
  const enter = useListEntrance(list.items.length > 0);

  const renderItem = useCallback(
    ({ item, index }: { item: TripCard; index: number }) => (
      <Animated.View entering={enter(index)}>
        {tab === 'past' ? (
          <PastTripCard trip={item} onOpen={() => onOpenTrip(item.id)} />
        ) : (
          <UpcomingTripCard trip={item} onOpen={() => onOpenTrip(item.id)} />
        )}
      </Animated.View>
    ),
    [tab, onOpenTrip, enter],
  );

  const passportNote = (
    <NoteCard title={tripsCopy.notes.passport.title} body={tripsCopy.notes.passport.body} />
  );
  const waitingNote = (
    <NoteCard
      title={tripsCopy.notes.waiting.title}
      body={tripsCopy.notes.waiting.body}
      tone={dark ? 'accent' : 'neutral'}
    />
  );
  // The note under each list once it has cards; an empty list carries it in its empty state.
  const footerNote =
    list.items.length === 0 ? null : tab === 'past' ? passportNote : tab === 'requests' ? waitingNote : null;

  const empty =
    tab === 'upcoming' ? (
      <EmptyState icon="airplane-outline"
        art={
          <View
            style={{
              width: 112,
              height: 112,
              borderRadius: 24,
              backgroundColor: theme.selectedFill,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <VectorIcon name="compass" size={52} color={theme.selectedForeground} />
          </View>
        }
        title={tripsCopy.empty.upcoming.title}
        body={tripsCopy.empty.upcoming.body}
        action={{
          label: tripsCopy.empty.upcoming.action,
          onPress: onExplore,
          variant: 'cta',
        }}
      />
    ) : tab === 'requests' ? (
      <View style={{ gap: 8 }}>
        <EmptyState icon="hourglass-outline" title={tripsCopy.empty.requests.title} body={tripsCopy.empty.requests.body} />
        <Animated.View entering={enterRise(80)}>{waitingNote}</Animated.View>
      </View>
    ) : (
      <View style={{ gap: 8 }}>
        <EmptyState icon="map-outline" title={tripsCopy.empty.past.title} body={tripsCopy.empty.past.body} />
        {passportNote}
      </View>
    );

  return (
    <Screen edges={['top']} padded={false}>
      <View className="px-20 pt-16">
        <Text variant="headingXl" accessibilityRole="header">
          {tripsCopy.title}
        </Text>
        <Animated.View key={tab} entering={FadeIn.duration(180)}>
          <Text variant="bodyMd" tone="muted" className="mt-6">
            {tripsCopy.lines[tab]}
          </Text>
        </Animated.View>
      </View>
      <View className="mt-20">
        <PillTabs options={tripsCopy.tabs} value={tab} onChange={setTab} look="outline" />
      </View>

      {list.loading ? (
        <ScrollView
          scrollEnabled={false}
          contentContainerStyle={{
            padding: SCREEN_GUTTER,
            paddingBottom: bottom,
          }}
        >
          <TripsSkeleton withImage={tab !== 'past'} />
        </ScrollView>
      ) : list.error && list.items.length === 0 ? (
        <Animated.View entering={FadeIn.duration(220)} className="flex-1 items-center justify-center px-20">
          <Text variant="headingMd" className="text-center" accessibilityRole="header">
            {tripsCopy.failed.title}
          </Text>
          <Text variant="bodySm" tone="muted" className="mt-8 text-center" accessibilityLiveRegion="polite">
            {tripsErrors[list.error]}
          </Text>
          <View className="mt-20">
            <Button label={tripsCopy.failed.retry} onPress={list.retry} />
          </View>
        </Animated.View>
      ) : (
        <FlatList
          key={tab}
          data={list.items}
          keyExtractor={(t) => t.id}
          renderItem={renderItem}
          contentContainerStyle={{
            padding: SCREEN_GUTTER,
            paddingBottom: bottom,
            gap: 16,
            flexGrow: 1,
          }}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.6}
          refreshControl={
            <RefreshControl refreshing={list.refreshing} onRefresh={() => {
              haptics.tap();
              list.refresh();
            }} tintColor={theme.primary} />
          }
          ListEmptyComponent={empty}
          ListFooterComponent={
            list.loadingMore ? (
              <View className="items-center py-8">
                <LoadingRing size={28} accessibilityLabel={tripsCopy.loadingMore} />
              </View>
            ) : (
              footerNote
            )
          }
        />
      )}
    </Screen>
  );
}
