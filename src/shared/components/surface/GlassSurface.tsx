import type { GlassColorScheme } from 'expo-glass-effect';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { useLiquidGlass } from '@shared/hooks/useLiquidGlass';
import { useTheme } from '@shared/hooks/useTheme';

import { GlassBackdrop } from './GlassBackdrop';

/**
 * A surface that floats over content — the tab bar, the map's controls, the
 * filter pills, round header buttons — drawn in Liquid Glass where the phone
 * can, and in the design's solid colour where it cannot (Android, iOS before 26,
 * Reduce Transparency on; see `useLiquidGlass`).
 *
 * Glass: the content sits on a SwiftUI `.glassEffect` shape (`GlassBackdrop`),
 * in the surface's own corner radius (a capsule for pills and circles).
 *   - `variant`: `regular` (default) is the frosted glass — its backing keeps
 *     labels easy to read, the look chosen for buttons, pills and bars alike;
 *     `clear` is the see-through glass, for art that must show through.
 *   - `tint` colours it (the chosen pill, the teal "+").
 *   - `appearance="light"` keeps glass on a photo pale, so dark text on it reads.
 *   - `onPlainPage`: for glass on the page's own background (the header's bell
 *     and chat, back buttons, filter pills) rather than over a photo or map.
 *     Frosted glass on a plain page has nothing to frost and barely shows, so it
 *     sits on a card-coloured shape with a small shadow of its own, as Explore's
 *     chips look over the map. Each shadow stays small, so a row of them never
 *     runs together into a grey band.
 * The solid version's shadow is left off: glass has its own depth.
 *
 * Why SwiftUI rather than the UIKit glass view (`expo-glass-effect`'s
 * GlassView): that view silently failed to draw inside lists and scroll views on
 * screens opened after launch, and when installed during a fade. SwiftUI draws
 * the effect itself, wherever the surface is.
 *
 * Touch: the glass takes none; callers keep their own press feedback (a dip or
 * a fade). `interactive` is accepted for when the system response can be wired.
 *
 * Solid: `fallbackColor` (or `tint`) with a soft shadow — exactly the Figma surface.
 */

export type GlassSurfaceProps = ViewProps & {
  /** The solid surface when glass is not available. */
  fallbackColor: string;
  /** Glass tint; also replaces `fallbackColor` on the solid surface when set. */
  tint?: string | null;
  /** `regular` (frosted, default) keeps labels readable; `clear` is see-through. */
  variant?: 'clear' | 'regular';
  /** Reserved for the system's touch response on glass. */
  interactive?: boolean;
  /** Soft shadow under the solid surface. */
  shadow?: boolean;
  /** Glass on the page's background, not over a photo or map: a card-coloured base and a small shadow. */
  onPlainPage?: boolean;
  /** Glass appearance: `auto` follows the app; `light` keeps glass on a photo pale. */
  appearance?: GlassColorScheme;
  style?: StyleProp<ViewStyle>;
};

/** Under glass on a plain page: small, so neighbours' shadows never merge. */
const PLAIN_PAGE_SHADOW: ViewStyle = {
  shadowColor: '#000',
  shadowOpacity: 0.1,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
};

const SOFT_SHADOW: ViewStyle = {
  shadowColor: '#000',
  shadowOpacity: 0.1,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 3,
};

/** A pill or circle is a capsule; anything else keeps its corner radius. */
function shapeOf(style: StyleProp<ViewStyle>) {
  const flat = StyleSheet.flatten(style) ?? {};
  const radius = typeof flat.borderRadius === 'number' ? flat.borderRadius : 0;
  const w = typeof flat.width === 'number' ? flat.width : null;
  const h = typeof flat.height === 'number' ? flat.height : null;
  const smallest = w !== null && h !== null ? Math.min(w, h) : null;
  const capsule = radius >= 999 || (smallest !== null && radius * 2 >= smallest);
  return capsule ? ({ capsule: true } as const) : ({ capsule: false, radius } as const);
}

export function GlassSurface({
  fallbackColor,
  tint = null,
  variant = 'regular',
  interactive: _interactive = false,
  shadow = true,
  appearance = 'auto',
  onPlainPage = false,
  style,
  children,
  ...props
}: GlassSurfaceProps) {
  const glass = useLiquidGlass();
  const theme = useTheme();

  if (!glass) {
    return (
      <View
        style={[{ backgroundColor: tint ?? fallbackColor }, shadow ? SOFT_SHADOW : null, style]}
        {...props}
      >
        {children}
      </View>
    );
  }

  return (
    <View
      style={[onPlainPage ? [PLAIN_PAGE_SHADOW, { backgroundColor: theme.card }] : null, style]}
      {...props}
    >
      <GlassBackdrop variant={variant} tint={tint} shape={shapeOf(style)} appearance={appearance} />
      {children}
    </View>
  );
}
