import { useCallback, useRef, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  EmptyState,
  LoadingRing,
  NoteCard,
  PillTabs,
  PostListCardSkeleton,
  Screen,
  SkeletonPulse,
  Text,
  VectorIcon,
  enterRise,
  tabBarMinimize,
  useListEntrance,
  useMinimizeTabBarOnScroll,
  useOnSignal,
} from '@shared/components';
import { haptics } from '@shared/feedback/haptics';
import { useTheme } from '@shared/hooks/useTheme';
import { useAppColorScheme } from '@shared/hooks/useAppColorScheme';
import { SCREEN_GUTTER } from '@shared/theme';

import type { TripCard, TripsTab } from '../../domain/entities/Trip';
import { TripListCard } from '../components/TripListCard';
import { tripsCopy, tripsErrors } from '../copy';
import { useTripList } from '../hooks/useTripList';

/**
 * The Trips tab (Figma Your trips, light and dark; API map §8): "Your trips",
 * a line that changes with the tab, the Upcoming / Requests / Past / My posts
 * pills, then the list.
 *
 *   - Upcoming: posts I'm going to and posts I host that haven't ended, soonest
 *     first, tagged Going or Hosting (`GET /me/rsvps`, `GET /me/posts`).
 *   - Requests: what I'm waiting to get into — private posts I asked to join,
 *     tagged Request sent (`GET /me/rsvps?state=requested`), then posts whose
 *     waitlist I'm on, tagged Waitlisted (`state=waitlisted`) — with the
 *     "Still waiting?" note under them (or under the empty state).
 *   - Past: what I went to (`GET /me/attended`), with the passport note under it.
 *   - My posts: everything I host (`GET /me/posts`), newest first, tagged
 *     Hosting, Completed once it is over, or Cancelled. It was a tab at the
 *     foot of the profile until 25 Nov (product), and is not in the Figma frames.
 *
 * A trip is the card a post is on Home (`TripListCard`, product 25 Nov), with
 * how I stand with it at its top right and, at its foot, who is joining and
 * "View trip". The pills sit over a hairline, as Home's do, and the first card
 * starts a card's gap under it: the cards scroll under the line, where they
 * used to run up against the pills.
 *
 * Each list pulls to refresh and loads more near its end; the first cards rise
 * in a short stagger. The line under the title cross-fades with the tab. The
 * list keeps clear of the floating tab bar.
 */

const TAB_BAR_CLEARANCE = 120;
/** Between one card and the next, and between the pills' hairline and the first: Home's. */
const CARD_GAP = 16;
/**
 * An empty list that has a note under its message (Requests, Past): the two as
 * one block, in the middle of the space between the pills and the tab bar, as
 * the empty states without a note already are. Left at the top, they had half
 * the screen blank under them. The message is in a plain view of its own so it
 * keeps its own height: it would otherwise grow to fill the space and push the
 * note to the foot.
 */
const EMPTY_WITH_NOTE = { flexGrow: 1, justifyContent: 'center', gap: 8 } as const;

export type TripsScreenProps = {
  onOpenTrip: (id: string) => void;
  onExplore: () => void;
  /** Changes when the Trips tab is tapped while Trips is in front: the list goes back to its top. */
  toTopSignal?: number;
};

export function TripsScreen({ onOpenTrip, onExplore, toTopSignal }: TripsScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dark = useAppColorScheme() === 'dark';
  const [tab, setTab] = useState<TripsTab>('upcoming');
  const list = useTripList(tab);
  const bottom = TAB_BAR_CLEARANCE + insets.bottom;
  // Scrolling down a list shrinks the tab bar out of the way; back up brings it back.
  const minimizeOnScroll = useMinimizeTabBarOnScroll();
  const trips = useRef<FlatList<(typeof list.items)[number]>>(null);
  // The Trips tab tapped while on Trips: back to the top of the list.
  useOnSignal(toTopSignal, () => {
    tabBarMinimize.set(false);
    trips.current?.scrollToOffset({ offset: 0, animated: true });
  });
  // The first cards rise in once per tab, never again as the list re-mounts rows.
  const enter = useListEntrance(list.items.length > 0);

  const renderItem = useCallback(
    ({ item, index }: { item: TripCard; index: number }) => (
      <Animated.View entering={enter(index)}>
        <TripListCard trip={item} onOpen={() => onOpenTrip(item.id)} />
      </Animated.View>
    ),
    [onOpenTrip, enter],
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
      <View style={EMPTY_WITH_NOTE}>
        <View>
          <EmptyState
            icon="hourglass-outline"
            title={tripsCopy.empty.requests.title}
            body={tripsCopy.empty.requests.body}
          />
        </View>
        <Animated.View entering={enterRise(80)}>{waitingNote}</Animated.View>
      </View>
    ) : tab === 'mine' ? (
      <EmptyState icon="create-outline" title={tripsCopy.empty.mine.title} body={tripsCopy.empty.mine.body} />
    ) : (
      <View style={EMPTY_WITH_NOTE}>
        <View>
          <EmptyState icon="map-outline" title={tripsCopy.empty.past.title} body={tripsCopy.empty.past.body} />
        </View>
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
      {/* The pills over a hairline, as on Home: the cards scroll under the line. */}
      <View className="mt-20">
        <PillTabs options={tripsCopy.tabs} value={tab} onChange={setTab} look="outline" />
        <View className="mt-12" style={{ height: 1, backgroundColor: theme.border }} />
      </View>

      {list.loading ? (
        <ScrollView
          scrollEnabled={false}
          contentContainerStyle={{
            paddingHorizontal: SCREEN_GUTTER,
            paddingTop: CARD_GAP,
            paddingBottom: bottom,
          }}
        >
          {/* Two cards in outline, laid out as real ones are, so nothing shifts when the trips land. */}
          <SkeletonPulse label={tripsCopy.loading}>
            <View style={{ gap: CARD_GAP }}>
              <PostListCardSkeleton photo footer />
              <PostListCardSkeleton footer />
            </View>
          </SkeletonPulse>
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
          ref={trips}
          {...minimizeOnScroll}
          key={tab}
          data={list.items}
          keyExtractor={(t) => t.id}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingHorizontal: SCREEN_GUTTER,
            paddingTop: CARD_GAP,
            paddingBottom: bottom,
            gap: CARD_GAP,
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
