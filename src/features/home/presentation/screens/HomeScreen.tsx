import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react';
import {
  FlatList,
  RefreshControl,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LINKS_ORIGIN } from '@core/config/links';
import { ReportPostFlow, RsvpNoticeDialog, useRsvpNotice } from '@features/explore';
import { useSubscription } from '@features/payment';
import {
  Button,
  EmptyState,
  LoadFailedState,
  LoadingRing,
  PhotoViewer,
  Screen,
  Text,
  Toast,
  useListEntrance,
  tabBarMinimize,
  tabBarTop,
  useMinimizeTabBarOnScroll,
  useOnSignal,
  type MediaFrame,
} from '@shared/components';
import { haptics } from '@shared/feedback/haptics';
import { usePressOnce } from '@shared/hooks/usePressOnce';
import { setCurrencyCountry } from '@shared/state/preferredCurrency';
import { useTheme } from '@shared/hooks/useTheme';
import { shareLink } from '@shared/utils/shareLink';

import type { FeedFilter, PostCard } from '../../domain/entities/Feed';
import { FEED_FILTERS } from '../../domain/rules/feedRules';
import { FeedHeader } from '../components/FeedHeader';
import { FeedPost, HiddenPostRow } from '../components/FeedPost';
import { FeedSkeleton } from '../components/FeedSkeleton';
import { FilterPills } from '../components/FilterPills';
// The level card is switched off until the backend has levels (see below).
// import { LevelCard } from '../components/LevelCard';
import { homeCopy } from '../copy';
import { useCardCommentCount } from '../hooks/useCardCommentCount';
import { useFeed } from '../hooks/useFeed';
import { useHiddenPosts } from '../hooks/useHiddenPosts';
import { useLocationPrompt } from '../hooks/useLocationPrompt';
import { useTravelState } from '../hooks/useTravelState';
import { travelMemory } from '../state/travelMemory';

/**
 * The home feed (Home design, 24 Nov; light and dark): the place header, the
 * post-type pills over a hairline, then the posts, each a card with the page
 * showing between them (`FeedPost`: its photos, the type's tag, the title, the
 * price, when and where with Join, and Comment and Save at its foot).
 *
 * Until the first page lands the whole screen is the skeleton frame. The posts
 * enter in a short stagger (the first three; later pages simply appear). Pull to
 * refresh asks again from the top; nearing the end loads the next page.
 *
 * A post's photo opens full screen from where it sits (one `PhotoViewer` for
 * the whole feed). Its ⋯ menu hides it (remembered on this phone, with Undo in
 * its place until the feed next loads), copies its link, or reports it. Its
 * Comment button opens the post at its comments.
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
 * The list leaves room at its foot for the floating tab bar, and tells it how
 * the feed is scrolling: down the page the bar shrinks to its round button, back
 * up it returns (`useMinimizeTabBarOnScroll`).
 *
 * Each post's Join goes through "Before you RSVP" the first time on this
 * phone (the explore feature's notice, shared here); after that it joins at once.
 */

/**
 * Between the last post and the tab bar's top edge: the feed ends just above the bar,
 * not a blank band above it (the "+" floats over the last post's corner, as it does
 * over every other post).
 */
const END_GAP = 6;
/** "Link copied" sits this far above the bar, clear of it. */
const TOAST_LIFT = 48;
/** How much of the feed is kept drawn: see the list. `WINDOW_SCREENS` counts the one in view. */
const INITIAL_POSTS = 3;
const POSTS_PER_BATCH = 3;
const WINDOW_SCREENS = 9;

export type HomeScreenProps = {
  /**
   * Opens Travel. `here` is what the header shows, so Travel can name the
   * current place before `GET /me` answers: the teleport's name (`label`)
   * and whether the feed is on one.
   */
  onChooseCity: (here: { label: string | null; teleported: boolean }) => void;
  onOpenPost: (post: PostCard) => void;
  /** A post's comment button: the post, opened at its comments. Without it, the post simply opens. */
  onOpenComments?: (post: PostCard) => void;
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
  /**
   * Changes when the Home tab is tapped while Home is in front: the feed goes
   * back to its top, the latest post. Already there, it asks for newer posts.
   */
  toTopSignal?: number;
  /**
   * The Plans pill, tapped by someone without Travel Pro: Plans are a Pro
   * feature, so the route opens the paywall and the feed stays as it was.
   * Without it, the pill filters like the others.
   */
  onPlansLocked?: () => void;
};

/** The list's rows: the pinned pills, then the posts (one just hidden keeps its place as an Undo line). */
type Row = { kind: 'pills' } | { kind: 'post'; post: PostCard } | { kind: 'hidden'; post: PostCard };

/** How long "Link copied" stays up. */
const TOAST_MS = 2000;
const PILLS_ROW: Row = { kind: 'pills' };
/**
 * The pills row to pin. FlatList counts its header as child 0 only when there
 * is one: with the level card it is child 1, without it child 0. Pinning 1 with
 * no header pinned the first post instead, which then sat over the cards
 * scrolling under it.
 */
const STICKY_WITH_HEADER = [1];
const STICKY_WITHOUT_HEADER = [0];


export function HomeScreen({
  onChooseCity,
  onOpenPost,
  onOpenComments,
  onNotifications,
  unreadCount,
  onMessages,
  unreadChatsCount,
  onViewLevel,
  linkCard,
  toTopSignal,
  onPlansLocked,
}: HomeScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const feed = useFeed();
  // Who is signed in, from `GET /me` (already read for Travel): their own cards offer no RSVP.
  const viewerId = useTravelState()?.viewerId ?? null;
  const location = useLocationPrompt(feed.retry);
  const { isPro, loading: proLoading } = useSubscription();
  // Plans are a Pro feature (product, 23 Nov): without Pro the Plans pill opens the paywall
  // instead of a list of posts that would all be locked. While the subscription is still
  // being read nobody is turned away: the pill filters, and the server locks what it must.
  const { setFilter } = feed;
  const chooseFilter = useCallback(
    (next: FeedFilter) => {
      if (next === 'plan' && !isPro && !proLoading && onPlansLocked) {
        onPlansLocked();
        return;
      }
      setFilter(next);
    },
    [isPro, proLoading, onPlansLocked, setFilter],
  );
  // The country of the posts in front of them stands in for where they are while the phone's
  // own position is unknown (location off): it decides the currency the app works in.
  const feedCountry = feed.items[0]?.countryCode ?? null;
  useEffect(() => setCurrencyCountry(feedCountry, 'feed'), [feedCountry]);
  // Home stays mounted across the tabs; it unmounts when the person signs out,
  // and then the next account must not inherit this one's region or recent cities.
  useEffect(() => () => travelMemory.reset(), []);
  const barTop = tabBarTop(insets.bottom);
  const bottom = barTop + END_GAP;
  // Scrolling down the feed shrinks the tab bar out of the way; back up brings it back.
  const minimizeOnScroll = useMinimizeTabBarOnScroll();
  const reduceMotion = useReducedMotion();
  const list = useRef<FlatList<Row>>(null);
  // How far down the feed is, for the tab's second tap: top, or already there.
  const scrolledTo = useRef(0);
  const { onScroll: reportScroll, scrollEventThrottle } = minimizeOnScroll;
  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrolledTo.current = e.nativeEvent.contentOffset.y;
      reportScroll(e);
    },
    [reportScroll],
  );
  // The Home tab tapped while on Home: to the top of the feed, where the latest post is. Already
  // at the top, it asks for anything newer (as pulling down does).
  useOnSignal(toTopSignal, () => {
    tabBarMinimize.set(false);
    if (scrolledTo.current > 4) {
      list.current?.scrollToOffset({ offset: 0, animated: !reduceMotion });
      return;
    }
    if (!feed.loading && !feed.refreshing) {
      haptics.tap();
      feed.refresh();
    }
  });
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

  // "Hide post", remembered on this phone: hidden before this visit, a post is left out; hidden
  // during it, it keeps its place as a line with Undo.
  const hiddenPosts = useHiddenPosts(viewerId);
  const { hidden, justHidden } = hiddenPosts;

  const showPosts = !feed.loading && !(feed.error && feed.items.length === 0);
  // The first cards rise in once, when the feed first lands; never again as rows re-mount.
  const enter = useListEntrance(showPosts && feed.items.length > 0);
  const rows: Row[] = useMemo(
    () =>
      showPosts
        ? [
            PILLS_ROW,
            ...feed.items
              .filter((post) => !hidden.has(post.id))
              .map((post): Row => ({ kind: justHidden.has(post.id) ? 'hidden' : 'post', post })),
          ]
        : [PILLS_ROW],
    [showPosts, feed.items, hidden, justHidden],
  );

  // The route hands new functions in on every render. Held here, so the posts keep the
  // same handlers and only redraw when their own post changes.
  const handlers = useRef({ onOpenPost, onOpenComments, linkCard });
  useEffect(() => {
    handlers.current = { onOpenPost, onOpenComments, linkCard };
  }, [onOpenPost, onOpenComments, linkCard]);
  const openPost = useCallback((post: PostCard) => handlers.current.onOpenPost(post), []);
  const openComments = useCallback(
    (post: PostCard) => (handlers.current.onOpenComments ?? handlers.current.onOpenPost)(post),
    [],
  );
  const linked = linkCard !== undefined;
  const hasPlace = feed.place !== null;

  // One viewer for the whole feed: the tapped photo, and where it sits, to grow from.
  const [viewing, setViewing] = useState<{ post: PostCard; index: number; from: MediaFrame } | null>(null);
  const openPhoto = useCallback(
    (post: PostCard, index: number, from: MediaFrame) => setViewing({ post, index, from }),
    [],
  );
  const viewed = useMemo(
    () =>
      viewing
        ? { full: viewing.post.images.map((p) => p.full), cards: viewing.post.images.map((p) => p.card) }
        : null,
    [viewing],
  );

  const [reporting, setReporting] = useState<string | null>(null);
  const reportPost = useCallback((post: PostCard) => setReporting(post.id), []);
  const { hide, unhide } = hiddenPosts;
  const hidePost = useCallback((post: PostCard) => hide(post.id), [hide]);

  // "Copy post link": onto the clipboard, with a word to say so. The clipboard is a native
  // module some older builds lack; there the share sheet (which offers Copy) opens instead.
  const [toast, setToast] = useState(false);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(false), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);
  const copyLink = useCallback(async (post: PostCard) => {
    const link = `${LINKS_ORIGIN}/posts/${encodeURIComponent(post.id)}`;
    try {
      const Clipboard = (await import('expo-clipboard')) as typeof import('expo-clipboard');
      await Clipboard.setStringAsync(link);
      setToast(true);
    } catch {
      shareLink(`${post.title} on Ajala`, link);
    }
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: Row; index: number }) => {
      if (item.kind === 'pills') {
        return (
          // Opaque, so the cards scroll under the pinned pills rather than through them. With no
          // level card above them, the pills need their own breathing room under the header.
          <View style={{ backgroundColor: theme.background, paddingTop: 16 }}>
            <FilterPills value={feed.filter} onChange={chooseFilter} disabled={!hasPlace && feed.loading} />
            <View className="mt-12" style={{ height: 1, backgroundColor: theme.border }} />
          </View>
        );
      }
      const post = item.post;
      if (item.kind === 'hidden') return <HiddenPostRow onUndo={() => unhide(post.id)} />;
      const card = (
        <FeedCard
          post={post}
          mine={viewerId !== null && post.host.id === viewerId}
          linked={linked}
          onOpenPost={openPost}
          onBeforeRsvp={beforeRsvp}
          onOpenPhoto={openPhoto}
          onOpenComments={openComments}
          onHide={hidePost}
          onCopyLink={copyLink}
          onReport={reportPost}
        />
      );
      const wrap = handlers.current.linkCard;
      // `index` counts the pills row, so the first post is 1.
      return (
        <Animated.View entering={index >= 1 ? enter(index - 1) : undefined}>
          {wrap ? wrap(post, card) : card}
        </Animated.View>
      );
    },
    [
      openPost,
      beforeRsvp,
      openPhoto,
      openComments,
      hidePost,
      unhide,
      copyLink,
      reportPost,
      linked,
      theme,
      feed.filter,
      chooseFilter,
      hasPlace,
      feed.loading,
      enter,
      viewerId,
    ],
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
        ref={list}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
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
        // A post is most of a screen tall and costly to draw. The list's defaults kept
        // every post of a page mounted (ten screens' worth either side) and drew them ten at
        // a time, so anything that touches every post (a theme change, most of all) re-drew
        // sixteen when two are on screen. Four screens either side, three posts at a time: with
        // three either side, a run of fast flings reached the end of what was drawn.
        initialNumToRender={INITIAL_POSTS}
        maxToRenderPerBatch={POSTS_PER_BATCH}
        windowSize={WINDOW_SCREENS}
        scrollEnabled={!feed.loading}
        refreshControl={
          showPosts ? (
            <RefreshControl refreshing={feed.refreshing} onRefresh={() => {
              haptics.tap();
              feed.refresh();
            }} tintColor={theme.primary} />
          ) : undefined
        }
        ListFooterComponent={
          feed.loading ? (
            <FeedSkeleton />
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
            <View className="flex-1 px-20 py-48">
              <EmptyState
                icon="compass-outline"
                title={homeCopy.empty.title}
                body={homeCopy.empty.body(
                  feed.filter === 'all' ? 'posts' : typeLabel,
                  feed.place?.name ? homeCopy.empty.near(feed.place.name) : homeCopy.empty.nearYou,
                )}
              />
            </View>
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
      {/* The tapped photo grows from its place in the feed (`origin`); the card-size copies
          already on screen are what grows, and hold each page until its full size has loaded. */}
      <PhotoViewer
        isPresented={viewing !== null}
        images={viewed?.full ?? []}
        previews={viewed?.cards}
        initialIndex={viewing?.index ?? 0}
        origin={viewing?.from ?? null}
        label={viewing?.post.title}
        onDismiss={() => setViewing(null)}
      />
      <ReportPostFlow postId={reporting} onClose={() => setReporting(null)} />
      <Toast visible={toast} message={homeCopy.post.linkCopied} bottom={barTop + TOAST_LIFT} />
    </Screen>
  );
}

/**
 * A feed post with what the feed's cards don't carry yet: how many comments it
 * has (`useCardCommentCount`). Memoised with stable handlers, so a change
 * elsewhere on Home (a badge, a fetch status) does not redraw every post.
 */
const FeedCard = memo(function FeedCard({
  post,
  mine,
  linked,
  onOpenPost,
  onBeforeRsvp,
  onOpenPhoto,
  onOpenComments,
  onHide,
  onCopyLink,
  onReport,
  onPress: onLinkPress,
}: {
  post: PostCard;
  mine: boolean;
  /** The route wraps the post in a link, which does the opening. */
  linked: boolean;
  onOpenPost: (post: PostCard) => void;
  onBeforeRsvp: () => Promise<boolean>;
  onOpenPhoto: (post: PostCard, index: number, from: MediaFrame) => void;
  onOpenComments: (post: PostCard) => void;
  onHide: (post: PostCard) => void;
  onCopyLink: (post: PostCard) => void;
  onReport: (post: PostCard) => void;
  /**
   * Handed in by the route's `Link asChild` when the post sits in one: the link's
   * own open (with the zoom transition). It must reach the post's own presses, or
   * a tap on its title or its banner does nothing.
   */
  onPress?: () => void;
}) {
  const commentCount = useCardCommentCount(post.id);
  const open = useCallback(() => onOpenPost(post), [onOpenPost, post]);
  // Once per tap: the link opens the post itself (not through `router`, which has its own
  // guard), and a double tap opened the post twice.
  const openOnce = usePressOnce(linked ? (onLinkPress ?? open) : open);
  return (
    <FeedPost
      post={post}
      mine={mine}
      onOpen={openOnce}
      onBeforeRsvp={onBeforeRsvp}
      onOpenPhoto={onOpenPhoto}
      commentCount={commentCount}
      onOpenComments={onOpenComments}
      onHide={onHide}
      onCopyLink={onCopyLink}
      onReport={onReport}
    />
  );
});
