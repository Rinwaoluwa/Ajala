import { View } from 'react-native';

import { SkeletonBlock, SkeletonPulse } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER } from '@shared/theme';

/**
 * The feed while its first page loads: two posts in outline, each laid out as a
 * real one is (`FeedPost`), so nothing shifts when the posts land: the host's
 * photo and two bars, two lines of words, a photo with the next one peeking in,
 * the Join banner, and the two actions.
 */
export function FeedSkeleton() {
  return (
    <SkeletonPulse label="Loading the feed">
      <View>
        <SkeletonPost />
        <SkeletonPost />
      </View>
    </SkeletonPulse>
  );
}

function SkeletonPost() {
  const theme = useTheme();
  return (
    <View>
      <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 16 }}>
        <View className="flex-row items-center" style={{ gap: 12 }}>
          <SkeletonBlock width={44} height={44} radius={22} />
          <View style={{ gap: 8 }}>
            <SkeletonBlock width={130} height={14} radius={5} />
            <SkeletonBlock width={84} height={12} radius={5} />
          </View>
        </View>
        <View style={{ marginTop: 18, gap: 10 }}>
          <SkeletonBlock height={12} radius={6} />
          <SkeletonBlock width="62%" height={12} radius={6} />
        </View>
      </View>
      {/* The photo strip: one photo and the edge of the next, running off the screen. */}
      <View className="flex-row" style={{ marginTop: 26, paddingLeft: SCREEN_GUTTER, gap: 6, overflow: 'hidden' }}>
        <View style={{ width: '70%', aspectRatio: 1.18 }}>
          <SkeletonBlock width="100%" height="100%" radius={14} />
        </View>
        <View style={{ width: '70%', aspectRatio: 1.18 }}>
          <SkeletonBlock width="100%" height="100%" radius={14} />
        </View>
      </View>
      <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: 6 }}>
        <View style={{ marginTop: 12 }}>
          <SkeletonBlock height={60} radius={16} />
        </View>
        <View className="flex-row items-center justify-between" style={{ marginTop: 6, minHeight: 40 }}>
          <SkeletonBlock width={22} height={22} radius={6} />
          <SkeletonBlock width={22} height={22} radius={6} />
        </View>
      </View>
      <View style={{ height: 1, backgroundColor: theme.border }} />
    </View>
  );
}
