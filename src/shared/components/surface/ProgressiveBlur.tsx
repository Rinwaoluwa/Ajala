import { requireOptionalNativeModule } from 'expo';
import { useId, type ReactNode, type RefObject } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { fogStops } from './EdgeFade';

/**
 * A blur that is strongest at an edge and melts away from it, the way iMessage
 * frosts messages as they slide under its header: content goes soft and pale
 * gradually, rather than staying sharp up to a line. Pair it with an
 * `EdgeFade` on top for the pale wash; this gives the softness.
 *
 * Built from `expo-blur` under a gradient mask (`@react-native-masked-view`),
 * so the blur's strength follows the same curve as the fog (`fogStops`).
 *
 * Android blurs a chosen view rather than whatever is behind: wrap the
 * scrolling content in `BlurTarget` and pass its ref as `target`. The blur must
 * sit outside that wrapper (a sibling over it), never inside.
 *
 * Builds made before these native modules were added have neither; there
 * `progressiveBlurAvailable` is false, `ProgressiveBlur` draws nothing and
 * `BlurTarget` is a plain view. Callers then drop the effect altogether
 * (no fog either) and give their bar a solid background.
 */

type BlurModules = {
  BlurView: typeof import('expo-blur').BlurView;
  BlurTargetView: typeof import('expo-blur').BlurTargetView;
  MaskedView: typeof import('@react-native-masked-view/masked-view').default;
};

const modules: BlurModules | null = (() => {
  if (!requireOptionalNativeModule('ExpoBlur')) return null;
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const blur = require('expo-blur') as typeof import('expo-blur');
    const masked = require('@react-native-masked-view/masked-view') as typeof import('@react-native-masked-view/masked-view');
    /* eslint-enable @typescript-eslint/no-require-imports */
    return { BlurView: blur.BlurView, BlurTargetView: blur.BlurTargetView, MaskedView: masked.default };
  } catch {
    return null;
  }
})();

/** Whether this build can draw the blur (it has `expo-blur` and the masked view). */
export const progressiveBlurAvailable = modules !== null;

/** The content a `ProgressiveBlur` softens, on Android. A plain view elsewhere, or without the module. */
export function BlurTarget({
  targetRef,
  style,
  children,
}: {
  targetRef: RefObject<View | null>;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  if (!modules || Platform.OS !== 'android') return <View style={style}>{children}</View>;
  const { BlurTargetView } = modules;
  return (
    <BlurTargetView ref={targetRef} style={style}>
      {children}
    </BlurTargetView>
  );
}

export function ProgressiveBlur({
  edge = 'top',
  height,
  solid = 0,
  intensity = 28,
  target,
}: {
  edge?: 'top' | 'bottom';
  height: number;
  /** How far from the edge the blur stays at full strength. */
  solid?: number;
  /** 1 to 100. */
  intensity?: number;
  /** Android: the `BlurTarget` holding the content. */
  target?: RefObject<View | null>;
}) {
  const id = `blurMask${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  if (!modules) return null;
  const { BlurView, MaskedView } = modules;
  const stops = fogStops(height, solid, 1);
  return (
    <MaskedView
      pointerEvents="none"
      style={[styles.base, edge === 'top' ? { top: 0 } : { bottom: 0 }, { height }]}
      maskElement={
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id={id} x1="0" y1={edge === 'top' ? '0' : '1'} x2="0" y2={edge === 'top' ? '1' : '0'}>
              {stops.map((stop) => (
                <Stop key={stop.offset} offset={stop.offset} stopColor="#000" stopOpacity={stop.opacity} />
              ))}
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
        </Svg>
      }
    >
      <BlurView
        style={StyleSheet.absoluteFill}
        intensity={intensity}
        tint="default"
        blurMethod="dimezisBlurViewSdk31Plus"
        blurTarget={target}
      />
    </MaskedView>
  );
}

const styles = StyleSheet.create({ base: { position: 'absolute', left: 0, right: 0 } });
