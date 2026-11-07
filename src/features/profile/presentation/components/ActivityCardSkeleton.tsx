import { View } from 'react-native';

import { SkeletonBlock, SkeletonPulse } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

/**
 * Placeholders shaped like `ActivityCard` — the 16:7 photo, the two tags, the
 * city, title and date lines — while a list of activities loads (the Going and
 * Requested tabs on your profile). The blocks breathe together, as every
 * skeleton in the app does, and are read out once as "Loading your activities".
 */
export function ActivityCardSkeleton({ count = 2, label }: { count?: number; label: string }) {
  const theme = useTheme();
  return (
    <SkeletonPulse label={label}>
      <View style={{ gap: 16 }}>
        {Array.from({ length: count }, (_, i) => (
          <View
            key={i}
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.card,
              overflow: 'hidden',
            }}
          >
            {/* The photo keeps the card's 16:7 at any width, so it is sized by ratio, not a block height. */}
            <View style={{ aspectRatio: 16 / 7, backgroundColor: theme.skeleton }} />
            <View style={{ padding: 16, gap: 8 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <SkeletonBlock width={64} height={22} radius={11} />
                <SkeletonBlock width={56} height={22} radius={11} />
              </View>
              <SkeletonBlock width="35%" height={12} />
              <SkeletonBlock width="75%" height={20} />
              <SkeletonBlock width="50%" height={14} />
            </View>
          </View>
        ))}
      </View>
    </SkeletonPulse>
  );
}
