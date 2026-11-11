import { View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { useTheme } from '@shared/hooks/useTheme';
import { palette } from '@shared/theme';

/**
 * The pictures over a failed load. Drawn here as SVG, in the theme's colours,
 * so they hold on light and dark alike.
 *
 * `NoConnectionArt`: a charger whose cable has come apart, with a spark at the
 * break — "you're offline". `ServerDownArt`: a cloud with a crack through it —
 * "our side didn't answer".
 */

const SIZE = 120;

export function NoConnectionArt({ size = SIZE }: { size?: number }) {
  const theme = useTheme();
  const line = theme.muted;
  return (
    <View style={{ width: size, height: size * 0.75 }} accessible={false} importantForAccessibility="no">
      <Svg width={size} height={size * 0.75} viewBox="0 0 120 90" fill="none">
        {/* The plug, with its two prongs. */}
        <Rect x="8" y="30" width="34" height="30" rx="9" stroke={line} strokeWidth="3.5" fill={theme.surfaceMuted} />
        <Line x1="16" y1="30" x2="16" y2="20" stroke={line} strokeWidth="3.5" strokeLinecap="round" />
        <Line x1="34" y1="30" x2="34" y2="20" stroke={line} strokeWidth="3.5" strokeLinecap="round" />
        {/* The cable, broken in two. */}
        <Path d="M42 45 C 50 45, 52 45, 58 45" stroke={line} strokeWidth="3.5" strokeLinecap="round" />
        <Path d="M58 45 l -3 -6 M58 45 l -1 7" stroke={line} strokeWidth="3" strokeLinecap="round" />
        <Path d="M72 45 l 3 -6 M72 45 l 1 7" stroke={line} strokeWidth="3" strokeLinecap="round" />
        <Path
          d="M72 45 C 84 45, 86 45, 94 45 C 108 45, 112 58, 112 70"
          stroke={line}
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {/* The spark at the break. */}
        <Path d="M65 34 l -3 7 h 5 l -3 8" stroke={palette.coral} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx="56" cy="26" r="2" fill={palette.marigold} />
        <Circle cx="76" cy="60" r="2" fill={palette.marigold} />
      </Svg>
    </View>
  );
}

export function ServerDownArt({ size = SIZE }: { size?: number }) {
  const theme = useTheme();
  const line = theme.muted;
  return (
    <View style={{ width: size, height: size * 0.75 }} accessible={false} importantForAccessibility="no">
      <Svg width={size} height={size * 0.75} viewBox="0 0 120 90" fill="none">
        <Path
          d="M34 72 H 86 a 18 18 0 0 0 2 -36 a 24 24 0 0 0 -46 -6 a 16 16 0 0 0 -8 42 z"
          stroke={line}
          strokeWidth="3.5"
          strokeLinejoin="round"
          fill={theme.surfaceMuted}
        />
        <Path d="M60 36 l -6 14 h 10 l -6 16" stroke={palette.coral} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}
