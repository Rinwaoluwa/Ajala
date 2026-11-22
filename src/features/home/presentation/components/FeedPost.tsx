import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, TouchableOpacity, View, useColorScheme } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import {
  Avatar,
  JellyPress,
  MediaCarousel,
  PopoverMenu,
  RollingCount,
  SkeletonBlock,
  Text,
  TextLink,
  VectorIcon,
  formatCardDate,
  formatCardTime,
  formatDistance,
  type MediaFrame,
  type PopoverAction,
} from '@shared/components';
import { useFontScale } from '@shared/hooks/useFontScale';
import { useRsvpPost } from '@shared/hooks/useRsvpPost';
import { useSavePost } from '@shared/hooks/useSavePost';
import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER, palette, textStyles } from '@shared/theme';
import { useTypeColors } from '@shared/theme/postTypeColors';

import type { PostCard } from '../../domain/entities/Feed';
import { homeCopy } from '../copy';

/**
 * A post in the home feed (Home design, 22 Nov): who is hosting, their words,
 * the photos, a banner that says what it is and joins it in one tap, and the
 * row of actions under it. Posts run edge to edge with a hairline between them.
 *
 *   - **Host row:** photo, name and one quiet line under it, then ⋮ (the menu).
 *     The design's line is when it was posted; cards don't carry that yet
 *     (backend request B10), so it says how far away the post is.
 *   - **Words:** the host's description, two lines. The feed's cards don't carry
 *     it either, so it arrives a moment after the card; the two lines are held
 *     open (as grey bars) until then, so nothing below jumps when it lands.
 *   - **Photos:** `MediaCarousel`. A tap opens that photo full screen.
 *   - **Banner:** the type's tag, the title, the day, time and place, and Join.
 *     Join is the quick RSVP every card has (`useRsvpPost`): it fills at once,
 *     says Going / Requested / Waitlisted after, and asks before leaving.
 *   - **Actions:** the heart, comments with their count, and the bookmark
 *     (`useSavePost`), as the design lays them out.
 *       - The heart is kept on this phone (`useLikedPosts`): the API has no
 *         likes yet (request B12), so it fills for the person who tapped it,
 *         and has no count, because there is no true number to show.
 *       - The comment count is the real one, read from the comments endpoint
 *         (cards don't carry it, request B11); the button opens the post at
 *         its comments.
 *
 * Tapping the host's words or the banner opens the post (`onOpen`).
 *
 * Motion: Join answers the touch with the jelly press every pill has; the heart
 * and the bookmark pop a little as they fill; a comment count that changes
 * rolls to its new number. Nothing moves by itself.
 */
export type FeedPostProps = {
  post: PostCard;
  /** The host's words; null when there are none. */
  description: string | null;
  /** Still being fetched: the two lines are held open. */
  descriptionLoading: boolean;
  /** The reader's own post: no Join, and nothing to hide or report. */
  mine: boolean;
  onOpen: () => void;
  onOpenHost?: (hostId: string) => void;
  /** Asked before the first quick RSVP; resolve true to go ahead. */
  onBeforeRsvp: () => Promise<boolean>;
  onOpenPhoto: (post: PostCard, index: number, from: MediaFrame) => void;
  /** Whether this person liked it (kept on this phone for now). */
  liked: boolean;
  onToggleLike: (post: PostCard) => void;
  /** How many comments it has; null until known. */
  commentCount: number | null;
  /** The comment button: the post, opened at its comments. */
  onOpenComments: (post: PostCard) => void;
  onHide: (post: PostCard) => void;
  onCopyLink: (post: PostCard) => void;
  onReport: (post: PostCard) => void;
};

/** The design's action icons are drawn in this pale slate (the supplied SVGs' own stroke). */
const ICON_LIGHT = '#B7C0D2';
const WORDS_LINES = 2;

function FeedPostComponent({
  post,
  description,
  descriptionLoading,
  mine,
  onOpen,
  onOpenHost,
  onBeforeRsvp,
  onOpenPhoto,
  liked,
  onToggleLike,
  commentCount,
  onOpenComments,
  onHide,
  onCopyLink,
  onReport,
}: FeedPostProps) {
  const theme = useTheme();
  const scale = useFontScale();
  const copy = homeCopy.post;
  const hostTap = onOpenHost && post.host.id ? () => onOpenHost(post.host.id) : undefined;
  const meta = formatDistance(post.distanceKm) ?? post.localityLabel;
  const cards = useMemo(() => post.images.map((p) => p.card), [post.images]);
  const openPhoto = useCallback(
    (index: number, from: MediaFrame) => onOpenPhoto(post, index, from),
    [onOpenPhoto, post],
  );

  const menu: PopoverAction[] = useMemo(
    () => [
      ...(mine ? [] : [{ label: copy.menu.hide, hint: copy.menu.hideHint, onPress: () => onHide(post) }]),
      { label: copy.menu.copy, hint: copy.menu.copyHint, onPress: () => onCopyLink(post) },
      ...(mine
        ? []
        : [{ label: copy.menu.report, hint: copy.menu.reportHint, destructive: true, onPress: () => onReport(post) }]),
    ],
    [mine, copy, post, onHide, onCopyLink, onReport],
  );

  const wordsHeight = Math.round(WORDS_LINES * textStyles.bodyMd.lineHeight * scale);

  return (
    // One native view, never flattened away: the route's zoom link (`Link.AppleZoom`) takes a
    // single native child, and without this the post's pieces reached it one by one and only
    // the first (this background) was kept, so the feed drew blank.
    <View collapsable={false} style={{ backgroundColor: theme.background }}>
      <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Plain styles: a style function on a Pressable is dropped by the class-name interop. */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={hostTap}
            disabled={!hostTap}
            accessibilityRole={hostTap ? 'button' : undefined}
            accessibilityLabel={hostTap ? copy.openHost(post.host.name) : undefined}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <Avatar name={post.host.name} uri={post.host.avatarUrl} size={44} />
            <View style={{ flex: 1 }}>
              <Text variant="labelMd" numberOfLines={1}>
                {post.host.name}
              </Text>
              {meta ? (
                <Text variant="bodySm" tone="muted" numberOfLines={1}>
                  {meta}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
          <PopoverMenu actions={menu} accessibilityLabel={copy.more}>
            <View style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="ellipsis-vertical" size={20} color={theme.foreground} />
            </View>
          </PopoverMenu>
        </View>

        {descriptionLoading || description ? (
          <Pressable onPress={onOpen} accessibilityRole="button" style={{ marginTop: 12, minHeight: wordsHeight }}>
            {description ? (
              <Text variant="bodyMd" numberOfLines={WORDS_LINES}>
                {description}
              </Text>
            ) : (
              // The words on their way: two bars where the two lines will be.
              <View style={{ height: wordsHeight, justifyContent: 'space-evenly' }}>
                <SkeletonBlock height={12} radius={6} />
                <SkeletonBlock width="62%" height={12} radius={6} />
              </View>
            )}
          </Pressable>
        ) : null}
      </View>

      {cards.length > 0 ? (
        <View style={{ marginTop: 12 }}>
          <MediaCarousel images={cards} gutter={SCREEN_GUTTER} onOpen={openPhoto} label={copy.photos(post.title)} />
        </View>
      ) : null}

      <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: 6 }}>
        <JoinBanner post={post} mine={mine} onOpen={onOpen} onBeforeRsvp={onBeforeRsvp} />
        <PostActions
          post={post}
          liked={liked}
          onToggleLike={onToggleLike}
          commentCount={commentCount}
          onOpenComments={onOpenComments}
        />
      </View>
      <View style={{ height: 1, backgroundColor: theme.border }} />
    </View>
  );
}

/** Memoised with stable handlers, so a change elsewhere on Home redraws no post but the one it touches. */
export const FeedPost = memo(FeedPostComponent);

/**
 * "Meetup · Gallery Walk · 28 Nov · 6:00 PM · [Join]": the post as one line
 * you can act on. The whole banner opens the post; the button joins it.
 */
function JoinBanner({
  post,
  mine,
  onOpen,
  onBeforeRsvp,
}: {
  post: PostCard;
  mine: boolean;
  onOpen: () => void;
  onBeforeRsvp: () => Promise<boolean>;
}) {
  const typeColors = useTypeColors();
  const scale = useFontScale();
  // The banner is the brand's own pale teal in both schemes; the tag keeps its type's colour.
  const banner = typeColors.all;
  const type = typeColors[post.type];
  const date = post.startAt ? formatCardDate(post.startAt) : null;
  const time = post.startAt ? formatCardTime(post.startAt) : null;
  const when = [date, time, post.placeName].filter(Boolean).join(' · ');

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={[homeCopy.postType[post.type], post.title, when].filter(Boolean).join(', ')}
      style={{
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderRadius: 16,
        paddingVertical: 12,
        paddingLeft: 12,
        paddingRight: 10,
        backgroundColor: banner.soft,
      }}
    >
      <View style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: type.tag }}>
        <Text variant="labelXs" style={{ color: type.softLabel }}>
          {homeCopy.postType[post.type]}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        {/* One line at the default size; at a large text size the title may take two. */}
        <Text variant="labelSm" numberOfLines={scale > 1.15 ? 2 : 1} style={{ color: banner.softLabel }}>
          {post.title}
        </Text>
        {when ? (
          <Text variant="bodyXs" tone="muted" numberOfLines={1}>
            {when}
          </Text>
        ) : null}
      </View>
      <JoinButton post={post} mine={mine} onBeforeRsvp={onBeforeRsvp} />
    </Pressable>
  );
}

/**
 * Join, on the banner: the quick RSVP (`useRsvpPost`). Solid teal until joined;
 * after, a quiet pill with a tick that says where the person stands, and a tap
 * asks before leaving. A private post says Request. The host's own post says
 * Hosting and takes no tap. Someone the host turned away is offered nothing.
 */
function JoinButton({
  post,
  mine,
  onBeforeRsvp,
}: {
  post: PostCard;
  mine: boolean;
  onBeforeRsvp: () => Promise<boolean>;
}) {
  const theme = useTheme();
  const copy = homeCopy.post;
  const rsvp = useRsvpPost(post.id, post.rsvpState);
  const box = { borderRadius: 999, minHeight: 36, paddingHorizontal: 16, justifyContent: 'center' } as const;

  if (mine) {
    return (
      <View style={[box, { paddingHorizontal: 12 }]}>
        <Text variant="labelSm" tone="muted">
          {copy.hosting}
        </Text>
      </View>
    );
  }
  if (rsvp.closed) return null;

  const press = () => {
    if (rsvp.pending) return;
    if (rsvp.joined) {
      Alert.alert(copy.leaveTitle, copy.leaveBody, [
        { text: copy.stay, style: 'cancel' },
        { text: copy.leave, style: 'destructive', onPress: rsvp.leave },
      ]);
      return;
    }
    void onBeforeRsvp().then((ok) => ok && rsvp.join());
  };
  const label = !rsvp.joined
    ? post.visibility === 'private'
      ? copy.request
      : copy.join
    : rsvp.state === 'requested'
      ? copy.requested
      : rsvp.state === 'waitlisted'
        ? copy.waitlisted
        : copy.going;

  return (
    // The jelly press and light tap every pill in the app has.
    <JellyPress
      onPress={press}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: rsvp.pending, selected: rsvp.joined }}
    >
      <View
        style={[
          box,
          { flexDirection: 'row', alignItems: 'center', gap: 6, opacity: rsvp.pending ? 0.6 : 1 },
          rsvp.joined
            ? { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.primary, paddingHorizontal: 12 }
            : { backgroundColor: theme.primaryFill },
        ]}
      >
        {rsvp.joined ? <Ionicons name="checkmark" size={16} color={theme.primary} /> : null}
        <Text variant="labelSm" style={{ color: rsvp.joined ? theme.primary : palette.white }}>
          {label}
        </Text>
      </View>
    </JellyPress>
  );
}

/** A mark that answers its tap: up to 120% and back as it fills. Still with Reduce Motion. */
function usePop() {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const pop = () => {
    if (reduceMotion) return;
    scale.set(
      withSequence(
        withTiming(1.2, { duration: 110, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 160, easing: Easing.inOut(Easing.quad) }),
      ),
    );
  };
  return { style, pop };
}

/** The heart and the comments on the left, the bookmark on the right, as the design lays them out. */
function PostActions({
  post,
  liked,
  onToggleLike,
  commentCount,
  onOpenComments,
}: {
  post: PostCard;
  liked: boolean;
  onToggleLike: (post: PostCard) => void;
  commentCount: number | null;
  onOpenComments: (post: PostCard) => void;
}) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const copy = homeCopy.post;
  const { saved, toggle } = useSavePost(post.id, post.saved);
  const icon = dark ? theme.muted : ICON_LIGHT;
  const heart = usePop();
  const mark = usePop();
  // The heart answers the tap itself, at once; the feed's own list of likes catches up behind
  // it (that redraws the whole feed, which a tap should not wait for). It follows `liked`
  // whenever that changes from outside.
  const [shown, setShown] = useState(liked);
  const [lastLiked, setLastLiked] = useState(liked);
  if (liked !== lastLiked) {
    setLastLiked(liked);
    setShown(liked);
  }
  // The count beside the heart. The API has no likes (backend request B12), so there is no
  // number from anyone else yet: it is this person's own like, 1 or nothing. When cards carry
  // a like count, it is that count here.
  const likes = shown ? 1 : 0;

  return (
    <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center' }}>
      <TouchableOpacity
        activeOpacity={0.6}
        onPress={() => {
          heart.pop();
          setShown(!shown);
          onToggleLike(post);
        }}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={shown ? copy.liked : copy.like}
        accessibilityValue={likes ? { text: String(likes) } : undefined}
        accessibilityState={{ selected: shown }}
        // Wide enough for the icon and a short count, so the first like does not push the
        // comment button along.
        style={{ minHeight: 40, minWidth: 60, flexDirection: 'row', alignItems: 'center', gap: 6 }}
      >
        <Animated.View style={heart.style}>
          <VectorIcon name="heart" size={22} color={shown ? palette.coral : icon} filled={shown} />
        </Animated.View>
        {/* Rolls up by one on a like and back down on an unlike; nothing at 0. */}
        <RollingCount value={likes} hideZero variant="bodySm" color={shown ? palette.coral : theme.muted} />
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.6}
        onPress={() => onOpenComments(post)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={commentCount ? copy.comments(commentCount) : copy.comment}
        style={{ minHeight: 40, minWidth: 60, flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 12 }}
      >
        <VectorIcon name="comment" size={22} color={icon} />
        {/* No "0", as the design shows none; in place once known, so a first comment rolls in. */}
        {commentCount !== null ? (
          <RollingCount value={commentCount} hideZero variant="bodySm" color={theme.muted} />
        ) : null}
      </TouchableOpacity>
      <View style={{ flex: 1 }} />
      <TouchableOpacity
        activeOpacity={0.6}
        onPress={() => {
          mark.pop();
          toggle();
        }}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={saved ? copy.saved : copy.save}
        accessibilityState={{ selected: saved }}
        style={{ minHeight: 40, minWidth: 40, alignItems: 'flex-end', justifyContent: 'center' }}
      >
        <Animated.View style={mark.style}>
          <VectorIcon name="bookmark" size={22} color={saved ? theme.primary : icon} filled={saved} />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

/**
 * What a post hidden a moment ago leaves in its place: one line and Undo, so a
 * slip is put right where it happened. Gone the next time the feed loads.
 */
export function HiddenPostRow({ onUndo }: { onUndo: () => void }) {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeIn.duration(180)} style={{ backgroundColor: theme.background }}>
      <View
        style={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingVertical: 14,
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <Text variant="bodySm" tone="muted" accessibilityLiveRegion="polite">
          {homeCopy.post.hidden}
        </Text>
        <TextLink label={homeCopy.post.undo} onPress={onUndo} />
      </View>
      <View style={{ height: 1, backgroundColor: theme.border }} />
    </Animated.View>
  );
}
