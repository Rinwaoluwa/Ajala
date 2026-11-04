import type { ReactNode } from 'react';
import { TouchableOpacity } from 'react-native';

import { GlassSurface } from '@shared/components';
import { useLiquidGlass } from '@shared/hooks/useLiquidGlass';
import { useTheme } from '@shared/hooks/useTheme';

/**
 * A 40pt round icon button floating at the top of a profile (settings, messages,
 * ⋯): Liquid Glass where the phone has it, a pale circle elsewhere. On glass the
 * system answers the press, so the dim is only for the solid version.
 */
export function RoundIconButton({
  label,
  onPress,
  children,
  size = 40,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
  size?: number;
}) {
  const theme = useTheme();
  const glass = useLiquidGlass();
  return (
    <TouchableOpacity
      activeOpacity={glass ? 1 : 0.6}
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <GlassSurface
        fallbackColor={theme.surfaceMuted}
        interactive
        shadow={false}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </GlassSurface>
    </TouchableOpacity>
  );
}
