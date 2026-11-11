import { useEffect, useId, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useTheme } from '@shared/hooks/useTheme';

/**
 * A soft fog where scrolling content meets a fixed edge, the way iMessage
 * washes messages out under its header instead of cutting them off. Drawn in
 * the page colour and laid over the top or bottom of its parent; it never
 * takes touches.
 *
 *   - `solid`: how far from the edge the fog stays at full `strength`, the
 *     part that sits behind a header's controls and keeps them readable.
 *   - Past that it thins out over the rest of `height` along an ease curve
 *     (a raised cosine, over many stops), so there is no point where the fog
 *     visibly starts or stops. A straight two- or three-stop fade showed a band.
 *
 * `visible` lets it come and go (160ms).
 */

const STEPS = 18;

/**
 * The fog's opacity along its depth, as gradient stops: `strength` from the edge
 * to `solid`, then thinning to nothing along a raised cosine over the rest of
 * `height`. Shared with `ProgressiveBlur`, so the blur and the fog fade together.
 */
export function fogStops(height: number, solid: number, strength: number): { offset: number; opacity: number }[] {
  const start = Math.min(Math.max(solid / height, 0), 0.95);
  const easing = Array.from({ length: STEPS + 1 }, (_, i) => {
    const t = i / STEPS;
    const offset = start + (1 - start) * t;
    return { offset, opacity: strength * Math.pow((1 + Math.cos(Math.PI * t)) / 2, 1.4) };
  });
  // Full strength from the edge to where the thinning starts.
  return start > 0 ? [{ offset: 0, opacity: strength }, ...easing] : easing;
}

export function EdgeFade({
  edge = 'top',
  height = 72,
  solid = 0,
  strength = 1,
  visible = true,
  color,
}: {
  edge?: 'top' | 'bottom';
  height?: number;
  solid?: number;
  /** The fog's opacity at its thickest, 0 to 1. */
  strength?: number;
  visible?: boolean;
  /** The colour it fades from; the page background by default. */
  color?: string;
}) {
  const theme = useTheme();
  const id = `edgeFade${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const fill = color ?? theme.background;
  const shown = useSharedValue(visible ? 1 : 0);
  useEffect(() => {
    shown.value = withTiming(visible ? 1 : 0, { duration: 160 });
  }, [visible, shown]);
  const style = useAnimatedStyle(() => ({ opacity: shown.value }));

  const stops = useMemo(() => fogStops(height, solid, strength), [solid, height, strength]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.base, edge === 'top' ? { top: 0 } : { bottom: 0 }, { height }, style]}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1={edge === 'top' ? '0' : '1'} x2="0" y2={edge === 'top' ? '1' : '0'}>
            {stops.map((stop) => (
              <Stop key={stop.offset} offset={stop.offset} stopColor={fill} stopOpacity={stop.opacity} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({ base: { position: 'absolute', left: 0, right: 0 } });
