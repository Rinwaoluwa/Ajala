import { View } from 'react-native';

import { SkeletonBlock, SkeletonPulse } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

/** Two cards' worth of placeholders while a Trips list loads: a photo block (Upcoming) or none (Past). */
export function TripsSkeleton({ withImage }: { withImage: boolean }) {
  const theme = useTheme();
  return (
    <SkeletonPulse>
      <View style={{ gap: 16 }}>
        {[0, 1].map((i) => (
          <View
            key={i}
            style={{
              borderRadius: 20,
              overflow: 'hidden',
              backgroundColor: theme.skeletonSurface,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            {withImage ? <SkeletonBlock height={170} radius={0} /> : null}
            <View style={{ padding: 18, gap: 10 }}>
              <SkeletonBlock width={120} height={20} radius={10} />
              <SkeletonBlock width="70%" height={22} />
              <SkeletonBlock width="45%" height={16} />
              <SkeletonBlock width="35%" height={16} />
            </View>
          </View>
        ))}
      </View>
    </SkeletonPulse>
  );
}
