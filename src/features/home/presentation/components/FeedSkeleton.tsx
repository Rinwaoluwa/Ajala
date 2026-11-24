import { View } from 'react-native';

import { PostListCardSkeleton, SkeletonPulse } from '@shared/components';
import { SCREEN_GUTTER } from '@shared/theme';

/**
 * The feed while its first page loads: two cards in outline, each laid out as a
 * real one is (`FeedPost`), so nothing shifts when the posts land. The first
 * has a photo at its head; the second is a card of words, as a post with no
 * photo is.
 */
export function FeedSkeleton() {
  const place = { marginHorizontal: SCREEN_GUTTER, marginTop: 16 };
  return (
    <SkeletonPulse label="Loading the feed">
      <View>
        <PostListCardSkeleton photo footer style={place} />
        <PostListCardSkeleton footer style={place} />
      </View>
    </SkeletonPulse>
  );
}
