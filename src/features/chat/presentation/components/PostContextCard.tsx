import { TouchableOpacity } from 'react-native';

import { Text } from '@shared/components';
import { palette } from '@shared/theme';

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
      {meta ? (
        <Text variant="bodySm" style={{ color: palette.inkSecondary }}>
          {meta}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}
