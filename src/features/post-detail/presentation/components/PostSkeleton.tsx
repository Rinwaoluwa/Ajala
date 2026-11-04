import { View, useWindowDimensions } from 'react-native';

import { SkeletonBlock, SkeletonPulse } from '@shared/components';

/**
 * The post page while it loads: the photo band, the title and lines, the info
 * cards. `body` leaves out the band and the title, for a page that already
 * draws them from the tapped card.
 */
export function PostSkeleton({ body = false }: { body?: boolean }) {
  const { width } = useWindowDimensions();
  return (
    <SkeletonPulse label="Loading the post">
      {body ? null : <SkeletonBlock width="100%" height={Math.round(width * 0.62)} radius={0} />}
      <View style={{ padding: body ? 0 : 20, gap: 14 }}>
        {body ? null : <SkeletonBlock width="75%" height={24} />}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <SkeletonBlock width={32} height={32} radius={16} />
          <SkeletonBlock width="40%" height={14} />
        </View>
        <SkeletonBlock width="100%" height={14} />
        <SkeletonBlock width="90%" height={14} />
        <SkeletonBlock width="60%" height={14} />
        <SkeletonBlock width="100%" height={68} radius={16} />
        <SkeletonBlock width="100%" height={68} radius={16} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <SkeletonBlock width="100%" height={92} radius={16} />
          </View>
          <View style={{ flex: 1 }}>
            <SkeletonBlock width="100%" height={92} radius={16} />
          </View>
        </View>
      </View>
    </SkeletonPulse>
  );
}
