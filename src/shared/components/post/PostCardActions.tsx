import { TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useSavePost } from '@shared/hooks/useSavePost';
import { useTheme } from '@shared/hooks/useTheme';

import { RollingCount } from '../ui/RollingCount';
import { Text } from '../ui/Text';
import { VectorIcon } from '../ui/VectorIcon';

/**
 * The foot of a post's list card (`PostListCard`'s `footer`, Home design, 24
 * Nov): Comment on the left, the bookmark on the right. The home feed's cards
 * and the Saved list's have it.
 *
 * Comment carries how many there are once that is known, and none at zero, as
 * the design shows none; a number that changes rolls to the new one. The
 * bookmark is the shared save (`useSavePost`): it fills at once, on every card
 * showing that post, and goes back if the server refuses. It pops as it fills
 * (still with Reduce Motion).
 *
 * The words are the caller's (`labels`), so each screen keeps its own.
 */
export type PostCardActionsLabels = {
  /** The button's word: "Comment". */
  comment: string;
  /** Read out once there are some: "3 comments". */
  comments: (count: number) => string;
  /** Read out for the bookmark, empty and filled. */
  save: string;
  saved: string;
};

export type PostCardActionsProps = {
  postId: string;
  /** The server's `saved` from the card the caller drew. */
  saved: boolean;
  /** How many comments it has; null until known. */
  commentCount: number | null;
  onOpenComments: () => void;
  labels: PostCardActionsLabels;
  /**
   * False where the post may not be saved (one locked to this reader: the
   * server refuses). It can still be unsaved: the bookmark shows while filled.
   */
  canSave?: boolean;
};

export function PostCardActions({
  postId,
  saved: savedAtFirst,
  commentCount,
  onOpenComments,
  labels,
  canSave = true,
}: PostCardActionsProps) {
  const theme = useTheme();
  const { saved, toggle } = useSavePost(postId, savedAtFirst);
  const mark = usePop();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48 }}>
      <TouchableOpacity
        activeOpacity={0.6}
        onPress={onOpenComments}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={commentCount ? labels.comments(commentCount) : labels.comment}
        style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 }}
      >
        <VectorIcon name="comment" size={20} color={theme.foreground} />
        <Text variant="labelSm">{labels.comment}</Text>
        {/* No "0", as the design shows none; in place once known, so a first comment rolls in. */}
        {commentCount !== null ? (
          <RollingCount value={commentCount} hideZero variant="labelSm" color={theme.muted} />
        ) : null}
      </TouchableOpacity>
      <View style={{ flex: 1 }} />
      {canSave || saved ? (
        <TouchableOpacity
          activeOpacity={0.6}
          onPress={() => {
            mark.pop();
            toggle();
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={saved ? labels.saved : labels.save}
          accessibilityState={{ selected: saved }}
          style={{ minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <Animated.View style={mark.style}>
            <VectorIcon name="bookmark" size={20} color={saved ? theme.primary : theme.foreground} filled={saved} />
          </Animated.View>
        </TouchableOpacity>
      ) : null}
    </View>
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
