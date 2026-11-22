import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { View, type ColorValue } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

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
 * A `stroked` icon (a post's heart, comment and bookmark) is supplied as a
 * stroke: outlined, the stroke is drawn in `color`; filled, the same shape is
 * painted in `color` under its stroke.
 *
 * At rest only the state showing is drawn. Both are drawn, one over the other,
 * just for the 160ms of a cross-fade. There are three of these on every feed
 * post; drawing both states of each all the time, with their animation hooks,
 * was a tenth of what a post costs to re-draw.
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
  // The state last drawn, and whether it is on its way to the other one.
  const [shown, setShown] = useState(filled);
  const [fading, setFading] = useState(false);
  if (filled !== shown) {
    setShown(filled);
    setFading(true);
  }
  const settle = useCallback(() => setFading(false), []);

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

  const strokedShape = (fill: boolean) => (
    <Svg width={size} height={size} viewBox={icon.viewBox}>
      {icon.paths.map((p, i) => (
        <Path
          key={i}
          d={p.d}
          fill={fill ? color : 'none'}
          stroke={color}
          strokeWidth={icon.strokeWidth ?? STROKE}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );

  // A solid icon (the two-tone house) is outlined by stroking its shapes. An
  // outline icon is filled by painting its silhouette and drawing its own strokes
  // over it a shade darker — the house's two tones, keeping every stroke.
  const outline = () =>
    icon.stroked ? strokedShape(false) : icon.solid ? draw(icon.paths, 'stroke', false) : draw(icon.paths, 'fill', false);
  const solid = () =>
    icon.stroked ? (
      strokedShape(true)
    ) : icon.solid ? (
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
      {fading ? (
        // A new fade for each change of direction.
        <Crossfade
          key={filled ? 'fill' : 'empty'}
          from={filled ? outline() : solid()}
          to={filled ? solid() : outline()}
          onDone={settle}
        />
      ) : filled ? (
        solid()
      ) : (
        outline()
      )}
    </View>
  );
}

/** One drawing fading out over the other fading in, then `onDone`. */
function Crossfade({ from, to, onDone }: { from: ReactNode; to: ReactNode; onDone: () => void }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(
      withTiming(1, { duration: FADE_MS, easing: Easing.out(Easing.quad) }, (finished) => {
        if (finished) scheduleOnRN(onDone);
      }),
    );
  }, [t, onDone]);
  const fromStyle = useAnimatedStyle(() => ({ opacity: 1 - t.value }));
  const toStyle = useAnimatedStyle(() => ({ opacity: t.value }));
  return (
    <>
      <Animated.View style={[{ position: 'absolute' }, fromStyle]}>{from}</Animated.View>
      <Animated.View style={[{ position: 'absolute' }, toStyle]}>{to}</Animated.View>
    </>
  );
}

export type { VectorIconName };
