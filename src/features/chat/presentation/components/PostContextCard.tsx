import Ionicons from '@expo/vector-icons/Ionicons';
import { TouchableOpacity, View } from 'react-native';

import { Text } from '@shared/components';
import { palette, textStyles } from '@shared/theme';

import type { ChatPost } from '../../domain/entities/Chat';
import { chatCopy } from '../copy';
import { postMeta } from '../format';

/**
 * The activity a conversation is about (Figma Chat: "Lekki Conservation Walk /
 * Sat, 17 Oct · 9:00 AM · Lagos"): a pale Marigold card that opens the post.
 * Pale in both schemes, as the frames draw it, so its text is ink.
 */
export function PostContextCard({
  post,
  onPress,
}: {
  post: ChatPost;
  onPress: () => void;
}) {
  const meta = postMeta(post.startAt, post.placeName);
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={chatCopy.thread.openPost(post.title)}
      style={{ borderRadius: 16, padding: 18, gap: 4, backgroundColor: '#FDF8EC' }}
    >
      <Text variant="headingSm" style={{ color: palette.ink }}>
        {post.title}
      </Text>
      {post.lockReason ? (
        // Locked (MOB-077): what it is, and that it opens the paywall rather than the post.
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="lock-closed" size={14} color={palette.inkSecondary} />
          <Text variant="bodySm" style={{ color: palette.inkSecondary, flexShrink: 1 }}>
            {chatCopy.thread.lockedPost[post.lockReason]}
          </Text>
        </View>
      ) : meta ? (
        <Text variant="bodySm" style={{ color: palette.inkSecondary }}>
          {meta}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

/**
 * Where a tagged post's card will be, while it is fetched: a message heard on
 * the socket names the post but carries no card (`taggedPostPending`). The
 * same pale card with two bars the height of its lines, so nothing moves when
 * the card lands.
 */
export function PostContextCardPlaceholder() {
  return (
    <View
      accessibilityLabel={chatCopy.thread.loadingPost}
      style={{ borderRadius: 16, padding: 18, gap: 4, backgroundColor: '#FDF8EC', minWidth: 200 }}
    >
      <View style={{ height: textStyles.headingSm.lineHeight, justifyContent: 'center' }}>
        <View style={{ height: 14, width: '70%', borderRadius: 7, backgroundColor: PLACEHOLDER_BAR }} />
      </View>
      <View style={{ height: textStyles.bodySm.lineHeight, justifyContent: 'center' }}>
        <View style={{ height: 10, width: '45%', borderRadius: 5, backgroundColor: PLACEHOLDER_BAR }} />
      </View>
    </View>
  );
}

/** A soft ink on the pale Marigold card, in both schemes (the card is pale in both). */
const PLACEHOLDER_BAR = 'rgba(31,41,55,0.10)';
