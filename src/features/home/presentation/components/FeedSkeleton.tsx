import { View } from 'react-native';

import { SkeletonBlock, SkeletonPulse } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

/**
 * "Home Feed / Skeleton": two cards, each a photo block over a paler body with
 * an avatar, a name, two title lines and the date and place bars.
 */
export function FeedSkeleton() {
  return (
    <SkeletonPulse label="Loading the feed">
      <View style={{ gap: 24 }}>
        <SkeletonCard />
        <SkeletonCard />
      </View>
    </SkeletonPulse>
  );
}

function SkeletonCard() {
  const theme = useTheme();
  return (
    <View style={{ borderRadius: 24, overflow: 'hidden', backgroundColor: theme.skeletonSurface }}>
      <SkeletonBlock height={220} radius={0} />
      <View style={{ padding: 16, gap: 10 }}>
        <View className="flex-row items-center" style={{ gap: 10 }}>
          <SkeletonBlock width={28} height={28} radius={14} />
          <SkeletonBlock width={110} height={14} radius={5} />
          <SkeletonBlock width={60} height={14} radius={7} />
        </View>
        <SkeletonBlock height={18} radius={6} />
        <SkeletonBlock width="55%" height={18} radius={6} />
        <View className="flex-row" style={{ gap: 12 }}>
          <SkeletonBlock width={100} height={12} radius={5} />
          <SkeletonBlock width={130} height={12} radius={5} />
        </View>
      </View>
    </View>
  );
}
