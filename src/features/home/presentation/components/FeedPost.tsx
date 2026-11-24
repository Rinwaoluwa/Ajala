import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useCallback, useMemo } from 'react';
import { TouchableOpacity, View, useWindowDimensions } from 'react-native';
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
  CardPhotos,
  JoinPill,
  PopoverMenu,
  PostListCard,
  RollingCount,
  Text,
  TextLink,
  VectorIcon,
  type JoinPillLabels,
  type MediaFrame,
  type PopoverAction,
} from '@shared/components';
import { useSavePost } from '@shared/hooks/useSavePost';
import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER } from '@shared/theme';

import type { PostCard } from '../../domain/entities/Feed';
import { homeCopy } from '../copy';

/**
 * A post in the home feed (Home design, 24 Nov): a card, one under another with
 * the page showing between them. It is the app's list card (`PostListCard`)
 * with everything the feed adds to it:
 *
 *   - **Photos** at its head when the post has any (`CardPhotos`): one at a
 *     time, swiped between, with dots and a count. A tap opens that photo full
 *     screen. A post with none is the same card without a head.
 *   - **The type's tag, the title and the host's words.** The feed's cards
 *     don't carry the words, so they arrive a moment after the card; two lines
 *     are held open (as grey bars) until then, so nothing below jumps.
 *   - **When and where, and Join** at the end of their line: the quick RSVP
 *     every card has (`JoinPill`). It fills at once, says Going / Requested /
 *     Waitlisted after, and asks before leaving.
 *   - **Comment and Save** under a hairline. Comment opens the post at its
 *     comments and carries their number once there are any (the real one, read
 *     from the comments endpoint: cards don't carry it, request B11). Save is
 *     the bookmark (`useSavePost`).
 *   - **⋯** at the top right, level with the tag: hide the post, copy its
 *     link, report it. The design draws no menu; these have nowhere else to
 *     live, so it is kept, small.
 *
 * The design's card does not say who is hosting or how far away it is, so the
 * feed no longer does: both are on the post's page.
 *
 * Tapping the card anywhere else opens the post (`onOpen`).
 *
 * Motion: the card dips a little under a press; Join answers the touch with the
 * jelly press every pill has; the bookmark pops as it fills; a comment count
 * that changes rolls to its new number. Nothing moves by itself.
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
  /** Asked before the first quick RSVP; resolve true to go ahead. */
  onBeforeRsvp: () => Promise<boolean>;
  onOpenPhoto: (post: PostCard, index: number, from: MediaFrame) => void;
  /** How many comments it has; null until known. */
  commentCount: number | null;
  /** The comment button: the post, opened at its comments. */
  onOpenComments: (post: PostCard) => void;
  onHide: (post: PostCard) => void;
  onCopyLink: (post: PostCard) => void;
  onReport: (post: PostCard) => void;
};

/** Between one card and the next, and under the pills. */
const CARD_GAP = 16;

function FeedPostComponent({
  post,
  description,
  descriptionLoading,
  mine,
  onOpen,
  onBeforeRsvp,
  onOpenPhoto,
  commentCount,
  onOpenComments,
  onHide,
  onCopyLink,
  onReport,
}: FeedPostProps) {
  const theme = useTheme();
  const { width: screen } = useWindowDimensions();
  const copy = homeCopy.post;
  const photos = useMemo(() => post.images.map((p) => p.card), [post.images]);
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

  return (
    <PostListCard
      type={post.type}
      typeLabel={homeCopy.postType[post.type]}
      title={post.title}
      words={description}
      wordsLoading={descriptionLoading}
      startAt={post.startAt}
      placeName={post.placeName}
      localityLabel={post.localityLabel}
      onPress={onOpen}
      style={{ marginHorizontal: SCREEN_GUTTER, marginTop: CARD_GAP }}
      photos={
        photos.length > 0 ? (
          <CardPhotos
            images={photos}
            // The card is the screen less its margins and its own hairline each side.
            width={screen - SCREEN_GUTTER * 2 - 2}
            onOpen={openPhoto}
            label={copy.photos(post.title)}
          />
        ) : null
      }
      corner={
        <PopoverMenu actions={menu} accessibilityLabel={copy.more}>
          <View style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="ellipsis-horizontal" size={18} color={theme.muted} />
          </View>
        </PopoverMenu>
      }
      action={
        <JoinPill
          postId={post.id}
          rsvpState={post.rsvpState}
          privatePost={post.visibility === 'private'}
          mine={mine}
          onBeforeRsvp={onBeforeRsvp}
          labels={JOIN_LABELS}
        />
      }
      footer={<PostActions post={post} commentCount={commentCount} onOpenComments={onOpenComments} />}
    />
  );
}

/** Memoised with stable handlers, so a change elsewhere on Home redraws no post but the one it touches. */
export const FeedPost = memo(FeedPostComponent);

/** The card's Join, in the feed's own words: a private post says Request. */
const JOIN_LABELS: JoinPillLabels = {
  join: homeCopy.post.join,
  request: homeCopy.post.request,
  going: homeCopy.post.going,
  requested: homeCopy.post.requested,
  waitlisted: homeCopy.post.waitlisted,
  hosting: homeCopy.post.hosting,
  leaveTitle: homeCopy.post.leaveTitle,
  leaveBody: homeCopy.post.leaveBody,
  stay: homeCopy.post.stay,
  leave: homeCopy.post.leave,
};

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

/** The card's foot: Comment on the left, the bookmark on the right, as the design lays them out. */
function PostActions({
  post,
  commentCount,
  onOpenComments,
}: {
  post: PostCard;
  commentCount: number | null;
  onOpenComments: (post: PostCard) => void;
}) {
  const theme = useTheme();
  const copy = homeCopy.post;
  const { saved, toggle } = useSavePost(post.id, post.saved);
  const mark = usePop();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48 }}>
      <TouchableOpacity
        activeOpacity={0.6}
        onPress={() => onOpenComments(post)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={commentCount ? copy.comments(commentCount) : copy.commentLabel}
        style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 }}
      >
        <VectorIcon name="comment" size={20} color={theme.foreground} />
        <Text variant="labelSm">{copy.commentLabel}</Text>
        {/* No "0", as the design shows none; in place once known, so a first comment rolls in. */}
        {commentCount !== null ? (
          <RollingCount value={commentCount} hideZero variant="labelSm" color={theme.muted} />
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
        style={{ minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' }}
      >
        <Animated.View style={mark.style}>
          <VectorIcon name="bookmark" size={20} color={saved ? theme.primary : theme.foreground} filled={saved} />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

/**
 * What a post hidden a moment ago leaves in its place: one line and Undo, in a
 * card's place among the cards, so a slip is put right where it happened. Gone
 * the next time the feed loads.
 */
export function HiddenPostRow({ onUndo }: { onUndo: () => void }) {
  const theme = useTheme();
  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      style={{
        marginHorizontal: SCREEN_GUTTER,
        marginTop: CARD_GAP,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.border,
        paddingHorizontal: 16,
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
    </Animated.View>
  );
}
