import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RsvpNoticeDialog, useRsvpNotice } from '@features/explore';
import { useSubscription } from '@features/payment';
import {
  Button,
  LoadFailedState,
  LoadingRing,
  PostCard as PostCardView,
  Screen,
  Text,
  useListEntrance,
} from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER } from '@shared/theme';

import type { PostCard } from '../../domain/entities/Feed';
import { FEED_FILTERS } from '../../domain/rules/feedRules';
import { FeedHeader } from '../components/FeedHeader';
import { FeedSkeleton } from '../components/FeedSkeleton';
import { FilterPills } from '../components/FilterPills';
// The level card is switched off until the backend has levels (see below).
// import { LevelCard } from '../components/LevelCard';
import { homeCopy } from '../copy';
import { useCardDescription } from '../hooks/useCardDescription';
import { useFeed } from '../hooks/useFeed';
import { useLocationPrompt } from '../hooks/useLocationPrompt';
import { useTravelState } from '../hooks/useTravelState';
import { travelMemory } from '../state/travelMemory';

/**
 * The home feed (Figma "Home Feed", its skeleton, light and dark): the place
 * header, the level card, the post-type pills over a hairline, then the cards.
 *
 * Until the first page lands the whole screen is the skeleton frame. The cards
 * enter in a short stagger (the first three; later pages simply appear). Pull to
 * refresh asks again from the top; nearing the end loads the next page.
 *
 * The level card scrolls away with the cards; the pills and their hairline stay
 * pinned under the place header once it has gone (a sticky row in the list), so
 * the filters are always in reach while the feed has the whole screen. While the
 * feed loads, fails or is empty, that state sits in the list under the pills.
 *
 * With no location and no teleport the feed answers 404 NO_LOCATION. That is
 * not an error: the list asks to turn location on, or to choose a place
 * (Travel). There is no home-city fallback any more.
 *
 * The list leaves room at its foot for the floating tab bar.
 *
 * Each card's quick RSVP goes through "Before you RSVP" the first time on this
 * phone (the explore feature's notice, shared here); after that it joins at once.
 */

/** Clear of the floating tab bar and its overhanging "+". */
const TAB_BAR_CLEARANCE = 120;

export type HomeScreenProps = {
  /**
   * Opens Travel. `here` is what the header shows, so Travel can name the
   * current place before `GET /me` answers: the teleport's name (`label`)
   * and whether the feed is on one.
   */
  onChooseCity: (here: { label: string | null; teleported: boolean }) => void;
  onOpenPost: (post: PostCard) => void;
  /** The host's photo or name on a card opens their profile. */
  onOpenHost?: (hostId: string) => void;
  onNotifications: () => void;
  /** Unread notifications, for the bell's badge (the route reads it from the notifications feature). */
  unreadCount?: number;
  onMessages: () => void;
  /** Conversations with anything unread, for the chat button's badge (the route reads it from the chat feature). */
  unreadChatsCount?: number;
  onViewLevel: () => void;
  /**
   * Wraps each card in a link that opens its post (the route supplies it; on
   * iOS 18+ with the zoom transition, the card growing into the page). When
   * given, the link does the opening and `onOpenPost` is not called.
   */
  linkCard?: (post: PostCard, card: ReactElement) => ReactNode;
};

/** The list's rows: the pinned pills, then the posts. */
type Row = { kind: 'pills' } | { kind: 'post'; post: PostCard };
const PILLS_ROW: Row = { kind: 'pills' };
/**
 * The pills row to pin. FlatList counts its header as child 0 only when there
 * is one: with the level card it is child 1, without it child 0. Pinning 1 with
 * no header pinned the first post instead, which then sat over the cards
 * scrolling under it.
 */
const STICKY_WITH_HEADER = [1];
const STICKY_WITHOUT_HEADER = [0];

/** A card inside a link: the link opens the post, so the card's own press does nothing. */
const OPENED_BY_LINK = () => undefined;

export function HomeScreen({
  onChooseCity,
  onOpenPost,
  onOpenHost,
  onNotifications,
  unreadCount,
  onMessages,
  unreadChatsCount,
  onViewLevel,
  linkCard,
}: HomeScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const feed = useFeed();
  // Who is signed in, from `GET /me` (already read for Travel): their own cards offer no RSVP.
  const viewerId = useTravelState()?.viewerId ?? null;
  const location = useLocationPrompt(feed.retry);
  const { isPro } = useSubscription();
  // Home stays mounted across the tabs; it unmounts when the person signs out,
  // and then the next account must not inherit this one's region or recent cities.
  useEffect(() => () => travelMemory.reset(), []);
  const bottom = TAB_BAR_CLEARANCE + insets.bottom;
  // The level card is switched off (product, 10 Nov): its numbers were a placeholder and the
  // backend has no levels yet. Put the block below back when the endpoint lands.
  // const [levelClosed, setLevelClosed] = useState(false);
  // const levelCard =
  //   feed.place && !levelClosed ? (
  //     // The gap below is the card's own padding, so its shadow isn't cut by the pinned pills' background.
  //     <Animated.View entering={enterRise(80)} exiting={FadeOut.duration(180)} className="mt-16 px-20 pb-12">
  //       <LevelCard onView={onViewLevel} onClose={() => setLevelClosed(true)} />
  //     </Animated.View>
  //   ) : null;
  const levelCard = null;
  void onViewLevel;

  // "Before you RSVP", once: a card's quick RSVP waits on the answer.
  const notice = useRsvpNotice();
  const [noticeOpen, setNoticeOpen] = useState(false);
  const noticeAnswer = useRef<((ok: boolean) => void) | null>(null);
  const beforeRsvp = useCallback(() => {
    if (notice.seen) return Promise.resolve(true);
    return new Promise<boolean>((resolve) => {
      noticeAnswer.current = resolve;
      setNoticeOpen(true);
    });
  }, [notice.seen]);
  const answerNotice = (ok: boolean) => {
    setNoticeOpen(false);
    if (ok) notice.acknowledge();
    noticeAnswer.current?.(ok);
    noticeAnswer.current = null;
  };

  const showPosts = !feed.loading && !(feed.error && feed.items.length === 0);
  // The first cards rise in once, when the feed first lands; never again as rows re-mount.
  const enter = useListEntrance(showPosts && feed.items.length > 0);
  const rows: Row[] = useMemo(
    () => (showPosts ? [PILLS_ROW, ...feed.items.map((post) => ({ kind: 'post' as const, post }))] : [PILLS_ROW]),
    [showPosts, feed.items],
  );

  // The route hands new functions in on every render. Held here, so the cards keep the
  // same handlers and only redraw when their own post changes.
  const handlers = useRef({ onOpenPost, onOpenHost, linkCard });
  useEffect(() => {
    handlers.current = { onOpenPost, onOpenHost, linkCard };
  }, [onOpenPost, onOpenHost, linkCard]);
  const openPost = useCallback((post: PostCard) => handlers.current.onOpenPost(post), []);
  const openHost = useCallback((hostId: string) => handlers.current.onOpenHost?.(hostId), []);
  const linked = linkCard !== undefined;
  const hasPlace = feed.place !== null;

  const renderItem = useCallback(
    ({ item, index }: { item: Row; index: number }) => {
      if (item.kind === 'pills') {
        return (
          // Opaque, so the cards scroll under the pinned pills rather than through them. With no
          // level card above them, the pills need their own breathing room under the header.
          <View style={{ backgroundColor: theme.background, paddingTop: 16 }}>
            <FilterPills value={feed.filter} onChange={feed.setFilter} disabled={!hasPlace && feed.loading} />
            <View className="mt-12" style={{ height: 1, backgroundColor: theme.border }} />
          </View>
        );
      }
      const post = item.post;
      const card = (
        <FeedCard
          post={post}
          mine={viewerId !== null && post.host.id === viewerId}
          linked={linked}
          onOpenPost={openPost}
          onOpenHost={openHost}
          onBeforeRsvp={beforeRsvp}
        />
      );
      const wrap = handlers.current.linkCard;
      // `index` counts the pills row, so the first card is 1.
      return (
        <Animated.View
          entering={index >= 1 ? enter(index - 1) : undefined}
          style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: index === 1 ? SCREEN_GUTTER : 24 }}
        >
          {wrap ? wrap(post, card) : card}
        </Animated.View>
      );
    },
    [openPost, openHost, beforeRsvp, linked, theme, feed.filter, feed.setFilter, hasPlace, feed.loading, enter, viewerId],
  );

  const typeLabel = FEED_FILTERS.find((f) => f.value === feed.filter)?.label.toLowerCase() ?? 'posts';
  const noLocation = feed.error === 'noLocation' && feed.items.length === 0;
  const openTravel = () =>
    onChooseCity({ label: feed.place?.label ?? null, teleported: feed.place?.teleported ?? false });

  return (
    <Screen edges={['top']} padded={false}>
      <FeedHeader
        place={feed.place}
        noLocation={noLocation}
        isPro={isPro}
        onChooseCity={openTravel}
        onNotifications={onNotifications}
        onMessages={onMessages}
        unreadCount={unreadCount}
        unreadChatsCount={unreadChatsCount}
      />

      <FlatList
        data={rows}
        keyExtractor={(row) => (row.kind === 'pills' ? 'pills' : row.post.id)}
        renderItem={renderItem}
        stickyHeaderIndices={levelCard ? STICKY_WITH_HEADER : STICKY_WITHOUT_HEADER}
        contentContainerStyle={{ paddingBottom: bottom, flexGrow: 1 }}
        // With no posts to show, the footer takes the rest of the screen so its message
        // (failed, empty) sits in the middle of the page, not just under the pills.
        ListFooterComponentStyle={showPosts && feed.items.length > 0 ? undefined : { flexGrow: 1 }}
        ListHeaderComponent={levelCard}
        onEndReached={showPosts ? feed.loadMore : undefined}
        onEndReachedThreshold={0.6}
        scrollEnabled={!feed.loading}
        refreshControl={
          showPosts ? (
            <RefreshControl refreshing={feed.refreshing} onRefresh={feed.refresh} tintColor={theme.primary} />
          ) : undefined
        }
        ListFooterComponent={
          feed.loading ? (
            <View style={{ padding: SCREEN_GUTTER }}>
              <FeedSkeleton />
            </View>
          ) : noLocation ? (
            <Animated.View entering={FadeIn.duration(220)} className="flex-1 items-center justify-center px-20 py-48">
              <Text variant="headingMd" className="text-center" accessibilityRole="header">
                {homeCopy.noLocation.title}
              </Text>
              <Text variant="bodySm" tone="muted" className="mt-8 text-center" accessibilityLiveRegion="polite">
                {homeCopy.noLocation.body}
              </Text>
              {/* Side by side when they fit, stacked at large text or on a narrow phone. */}
              <View className="mt-20 flex-row flex-wrap justify-center" style={{ gap: 12 }}>
                <Button
                  label={homeCopy.noLocation.turnOn}
                  loading={location.asking}
                  onPress={() => void location.turnOn()}
                />
                <Button label={homeCopy.noLocation.choose} variant="secondary" onPress={openTravel} />
              </View>
            </Animated.View>
          ) : feed.error && feed.items.length === 0 ? (
            <View className="flex-1 justify-center px-20 py-48">
              <LoadFailedState
                kind={feed.error === 'network' ? 'network' : 'server'}
                title={homeCopy.failed.title}
                body={feed.error === 'network' ? homeCopy.failed.network : homeCopy.failed.unknown}
                action={{ label: homeCopy.failed.retry, onPress: feed.retry, variant: 'primary' }}
              />
            </View>
          ) : feed.items.length === 0 ? (
            <Animated.View entering={FadeIn.duration(220)} className="flex-1 items-center justify-center px-20 py-48">
              <Text variant="headingMd" className="text-center">
                {homeCopy.empty.title}
              </Text>
              <Text variant="bodySm" tone="muted" className="mt-8 text-center">
                {homeCopy.empty.body(
                  feed.filter === 'all' ? 'posts' : typeLabel,
                  feed.place?.name ? homeCopy.empty.near(feed.place.name) : homeCopy.empty.nearYou,
                )}
              </Text>
            </Animated.View>
          ) : feed.loadingMore ? (
            <View className="items-center py-8">
              <LoadingRing size={28} accessibilityLabel="Loading more" />
            </View>
          ) : null
        }
      />
      <RsvpNoticeDialog
        isPresented={noticeOpen}
        onAccept={() => answerNotice(true)}
        onDismiss={() => answerNotice(false)}
      />
    </Screen>
  );
}

/**
 * A feed card with its description, which the feed's cards don't carry yet
 * (`useCardDescription`). Memoised with stable handlers, so a change elsewhere on
 * Home (a badge, a fetch status) does not redraw every card.
 */
const FeedCard = memo(function FeedCard({
  post,
  mine,
  linked,
  onOpenPost,
  onOpenHost,
  onBeforeRsvp,
}: {
  post: PostCard;
  mine: boolean;
  /** The route wraps the card in a link, which does the opening. */
  linked: boolean;
  onOpenPost: (post: PostCard) => void;
  onOpenHost: ComponentProps<typeof PostCardView>['onOpenHost'];
  onBeforeRsvp: ComponentProps<typeof PostCardView>['onBeforeRsvp'];
}) {
  const description = useCardDescription(post);
  const shown = useMemo(
    () => (mine || description !== post.description ? { ...post, description, ...(mine ? { mine } : null) } : post),
    [post, mine, description],
  );
  const open = useCallback(() => onOpenPost(post), [onOpenPost, post]);
  return (
    <PostCardView
      post={shown}
      onPress={linked ? OPENED_BY_LINK : open}
      onViewDetails={open}
      onOpenHost={onOpenHost}
      onBeforeRsvp={onBeforeRsvp}
    />
  );
});
