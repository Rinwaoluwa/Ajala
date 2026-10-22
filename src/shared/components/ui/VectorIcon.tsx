import { useEffect } from 'react';
import { View, type ColorValue } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import {
  vectorIcons,
  type VectorIconData,
  type VectorIconName,
  type VectorPath,
} from './vectorIcons.generated';

/**
 * A design icon drawn as vectors, outlined or filled — the tab bar's active and
 * inactive states, the heart on a card. The path data comes from the SVGs in
 * `assets/icons` (`npm run icons`; see `scripts/generate-icons.js`).
 *
 * Outlined, the icon's strokes are drawn in `color`. Filled, its silhouette is
 * painted in `color` and the same strokes go over it a shade darker — the two
 * tones of the design's house, with every stroke kept. The house itself fills
 * in its own colours unless `tintFilled`. `filled` cross-fades in 160ms.
 *
 * Icons that do not change state, or are multi-colour art, stay on `SvgIcon`.
 */

const STROKE = 1.5;
const FADE_MS = 160;

/** The filled state's strokes: the fill colour at 60% brightness (Marigold → the house door's brown). */
function darken(color: ColorValue): ColorValue {
  if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color)) return color;
  const channel = (i: number) =>
    Math.round(parseInt(color.slice(i, i + 2), 16) * 0.6)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

export type VectorIconProps = {
  name: VectorIconName;
  size: number;
  color: ColorValue;
  filled?: boolean;
  /** Paint a two-tone icon's filled state in `color` instead of its own colours. */
  tintFilled?: boolean;
};

export function VectorIcon({ name, size, color, filled = false, tintFilled = false }: VectorIconProps) {
  const icon: VectorIconData = vectorIcons[name];
  const on = useSharedValue(filled ? 1 : 0);

  useEffect(() => {
    on.value = withTiming(filled ? 1 : 0, { duration: FADE_MS, easing: Easing.out(Easing.quad) });
  }, [filled, on]);

  const outlineStyle = useAnimatedStyle(() => ({ opacity: 1 - on.value }));
  const filledStyle = useAnimatedStyle(() => ({ opacity: on.value }));

  const draw = (paths: readonly VectorPath[], mode: 'fill' | 'stroke', ownColours: boolean) => (
    <Svg width={size} height={size} viewBox={icon.viewBox}>
      {paths.map((p, i) =>
        mode === 'stroke' ? (
          <Path key={i} d={p.d} fill="none" stroke={color} strokeWidth={STROKE} strokeLinejoin="round" />
        ) : (
          <Path
            key={i}
            d={p.d}
            fill={ownColours && p.fill ? p.fill : color}
            fillRule={p.evenOdd ? 'evenodd' : 'nonzero'}
          />
        ),
      )}
    </Svg>
  );

  // A solid icon (the two-tone house) is outlined by stroking its shapes. An
  // outline icon is filled by painting its silhouette and drawing its own strokes
  // over it a shade darker — the house's two tones, keeping every stroke.
  const outline = icon.solid ? draw(icon.paths, 'stroke', false) : draw(icon.paths, 'fill', false);
  const solid = icon.solid ? (
    draw(icon.paths, 'fill', !tintFilled)
  ) : (
    <Svg width={size} height={size} viewBox={icon.viewBox}>
      {(icon.silhouette ?? []).map((p, i) => (
        <Path key={`s${i}`} d={p.d} fill={color} />
      ))}
      {icon.paths.map((p, i) => (
        <Path key={`p${i}`} d={p.d} fill={darken(color)} fillRule={p.evenOdd ? 'evenodd' : 'nonzero'} />
      ))}
    </Svg>
  );

  return (
    <View style={{ width: size, height: size }} accessible={false}>
      <Animated.View style={[{ position: 'absolute' }, outlineStyle]}>{outline}</Animated.View>
      <Animated.View style={[{ position: 'absolute' }, filledStyle]}>{solid}</Animated.View>
    </View>
  );
}

export type { VectorIconName };
