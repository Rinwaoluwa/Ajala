import { View } from 'react-native';

import { useTheme } from '@shared/hooks/useTheme';

/**
 * The pale overlapping circles before "5 travellers" (Figma Trips cards). A list
 * card knows how many are going but not who (`goingCount` only), so it shows up
 * to three soft circles rather than faces.
 */

const TINTS = ['#E9ECEF', '#FCE3D3', '#E8E4FB'] as const;

export function TravellerDots({ count, size = 28 }: { count: number; size?: number }) {
  const theme = useTheme();
  const shown = Math.min(count, TINTS.length);
  if (shown === 0) return null;
  return (
    <View
      style={{ flexDirection: 'row' }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {TINTS.slice(0, shown).map((tint, i) => (
        <View
          key={tint}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            marginLeft: i === 0 ? 0 : -size * 0.3,
            backgroundColor: tint,
            borderWidth: 2,
            borderColor: theme.card,
          }}
        />
      ))}
    </View>
  );
}
