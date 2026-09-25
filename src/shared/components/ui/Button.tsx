import { Button as ExpoButton, Host, Text as ExpoText } from '@expo/ui';
import { useCallback, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';

import { useTheme } from '@shared/hooks/useTheme';
import { layout, textStyles } from '@shared/theme';

import { resolveButtonOutline } from './buttonOutline';

/**
 * Button — a real SwiftUI / Jetpack Compose button, styled to the design.
 *
 * Measured from the Figma `Button` component (node 167-7636): Size=Large is 44pt
 * tall, radius token `Corner_Radius/80`, 20pt horizontal padding, fill
 * `Primary/Teal/100`, label `Label/Small` — Inter 500, 14/20 — in `Text/White`.
 *
 * Four things here are load-bearing. Each one has caused a visible bug on device.
 *
 * 1. VARIANT. Expo UI's `filled` maps to SwiftUI `borderedProminent`, which paints
 *    its own capsule in the platform tint and ignores a supplied background — the
 *    original cause of "the button is the wrong colour". `text` maps to `.plain`,
 *    which draws no chrome, so the background and radius below are what you see.
 *
 * 2. THE HOST IS KEYED ON ITS SIZING MODE. This is the subtle one. `matchContents`
 *    is read once, at mount; while it is on, the native side writes the SwiftUI
 *    content's size straight into React Native's shadow node (`setStyleSize`), and
 *    nothing ever clears that. So a Host that was ever hug-width stays that wide.
 *
 *    That bites whenever React reuses a Button across a layout change. On the
 *    onboarding screen, slides 1-3 render [Skip, Next] and the last slide renders
 *    [Sign Up, Sign In] — same element types at the same positions, so Sign Up *was*
 *    the Skip instance and Sign In *was* the Next instance. Their Hosts kept the
 *    hug-width they had measured, and SwiftUI centred a full-width button on a
 *    ~70pt host, pushing its left half off-screen. No width we passed could fix it.
 *    Keying the Host on `fullWidth` guarantees a fresh native view per mode.
 *
 * 3. FULL WIDTH. The Host fills its wrapper with `width: '100%'` — legal because a
 *    Host's `style` is an ordinary React Native ViewStyle. The SwiftUI button inside
 *    is framed to the wrapper's measured pixel width, because `UniversalStyle` has no
 *    percentage support. A SwiftUI Button centres its label in its frame, so that
 *    frame is also what centres the label.
 *
 * 4. RADIUS AND STROKE. The token is 80. CSS clamps an oversized radius to a pill;
 *    SwiftUI and Compose do not, so it is capped at half the height here. The
 *    outlined variant's stroke is resolved per platform by `resolveButtonOutline` —
 *    on iOS a rectangular `.border()` would be clipped by the pill and come out
 *    chopped, so an inset `strokeBorder` is used instead.
 *
 * The label is a child rather than the `label` prop, because only a child can carry
 * our font and colour. Press feedback, focus order and accessibility stay native.
 */

export type ButtonVariant = 'primary' | 'cta' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const HEIGHT: Record<ButtonSize, number> = layout.button.height;

type VariantColors = { background?: string; border?: string; label: string };

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  /**
   * A write is in flight. The button goes inert, which is what prevents the
   * double-submit. Expo UI's universal set has no spinner, so show one beside the
   * button if an action is slow enough to need it.
   */
  loading?: boolean;
  fullWidth?: boolean;
  testID?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  testID,
}: ButtonProps) {
  const theme = useTheme();
  const [measuredWidth, setMeasuredWidth] = useState(0);

  const isInactive = disabled || loading;
  const height = HEIGHT[size];
  const radius = Math.min(layout.button.radius, height / 2);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setMeasuredWidth(e.nativeEvent.layout.width);
  }, []);

  // One lookup rather than a chain of conditionals: adding a variant is one entry.
  const colors: Record<ButtonVariant, VariantColors> = {
    primary: { background: theme.primary, label: theme.primaryForeground },
    cta: { background: theme.cta, label: theme.ctaForeground },
    secondary: { border: theme.primary, label: theme.primary },
    ghost: { label: theme.foreground },
  };
  const { background, border, label: labelColor } = colors[variant];

  // Platform decides whether the stroke rides on `style` or on a SwiftUI modifier.
  const outline = resolveButtonOutline(border, layout.button.borderWidth, radius);

  // A ghost button reads as a text link, so it sits flush with the content edge.
  const paddingHorizontal = variant === 'ghost' ? 0 : layout.button.paddingX;

  // A full-width button cannot render until it knows how wide its container is.
  const awaitingMeasure = fullWidth && measuredWidth === 0;
  const width = fullWidth ? measuredWidth : undefined;

  return (
    <View
      onLayout={fullWidth ? handleLayout : undefined}
      style={{ height, alignSelf: fullWidth ? 'stretch' : 'flex-start' }}
    >
      {awaitingMeasure ? null : (
        <Host
          // A fresh native view per sizing mode — see note 2 above. Without this,
          // a Button reused from a hug-width slot keeps its old width.
          key={fullWidth ? 'fill' : 'hug'}
          matchContents={!fullWidth}
          style={fullWidth ? { height, width: '100%' } : { height }}
        >
          <ExpoButton
            variant="text"
            onPress={onPress}
            disabled={isInactive}
            testID={testID}
            modifiers={outline.modifiers}
            style={{
              height,
              ...(width !== undefined ? { width } : null),
              paddingHorizontal,
              backgroundColor: background,
              borderRadius: radius,
              ...(outline.styleBorder ?? null),
              opacity: isInactive ? 0.4 : 1,
            }}
          >
            <ExpoText
              textStyle={{
                fontFamily: textStyles.labelSm.fontFamily,
                fontSize: textStyles.labelSm.fontSize,
                lineHeight: textStyles.labelSm.lineHeight,
                fontWeight: '500',
                color: labelColor,
                textAlign: 'center',
              }}
            >
              {label}
            </ExpoText>
          </ExpoButton>
        </Host>
      )}
    </View>
  );
}

/** Kept so a caller can reserve space for a button without importing the component. */
export const buttonMetrics = { height: HEIGHT } as const;
