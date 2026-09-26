import { Button as ExpoButton, Host, Row, Text as ExpoText } from '@expo/ui';
import { useCallback, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';

import { useTheme } from '@shared/hooks/useTheme';
import { layout, textStyles } from '@shared/theme';

import { resolveButtonOutline } from './buttonOutline';
import { NativeIcon, type NativeIconSource } from './NativeIcon';
import { NATIVE_BUTTON_INSET } from './nativeButtonInset';

/**
 * Button — a real SwiftUI / Jetpack Compose button, styled to the design.
 *
 * Measured from the Figma `Button` component (node 167-7636): Size=Large is 44pt
 * tall, radius token `Corner_Radius/80`, 20pt horizontal padding, fill
 * `Primary/Teal/100`, label `Label/Small` — Inter 500, 14/20 — in `Text/White`.
 * The sign-up screens add a disabled look (muted fill, grey label) and the social
 * "Sign up with …" style (`neutral`: a 12pt-radius outline with a leading mark).
 *
 * Two layers:
 *   - `ButtonCore` is the native button alone. Use it where you are already inside
 *     Expo UI content — a BottomSheet, a Host of your own. It needs a width if it
 *     should fill.
 *   - `Button` wraps it in a Host and handles sizing. Use this everywhere else.
 *
 * Four things here are load-bearing. Each one has caused a visible bug on device.
 *
 * 1. VARIANT. Expo UI's `filled` maps to SwiftUI `borderedProminent`, which paints
 *    its own capsule in the platform tint and ignores a supplied background — the
 *    original cause of "the button is the wrong colour". `text` maps to `.plain`,
 *    which draws no chrome, so the background and radius below are what you see.
 *
 * 2. THE HOST IS KEYED ON ITS SIZING MODE. `matchContents` is read once, at mount;
 *    while it is on, the native side writes the SwiftUI content's size straight into
 *    React Native's shadow node (`setStyleSize`), and nothing ever clears that. So a
 *    Host that was ever hug-width stays that wide. When React reused a hug-width
 *    Button as a full-width one, SwiftUI centred the wide button on a ~70pt host and
 *    pushed half of it off-screen. Keying the Host on `fullWidth` guarantees a fresh
 *    native view per mode.
 *
 * 3. FULL WIDTH. The Host fills its wrapper with `width: '100%'` — legal because a
 *    Host's `style` is an ordinary React Native ViewStyle. The SwiftUI button inside
 *    is framed to the wrapper's measured pixel width, because `UniversalStyle` has no
 *    percentage support. A SwiftUI Button centres its label in its frame, so that
 *    frame is also what centres the label.
 *
 * 4. RADIUS AND STROKE. The pill token is 80. CSS clamps an oversized radius to a
 *    pill; SwiftUI and Compose do not, so it is capped at half the height here. The
 *    outline is resolved per platform by `resolveButtonOutline` — on iOS a
 *    rectangular `.border()` would be clipped by the rounded shape and come out
 *    chopped, so an inset `strokeBorder` is used instead.
 *
 * The label is a child rather than the `label` prop, because only a child can carry
 * our font and colour. Press feedback, focus order and accessibility stay native.
 */

export type ButtonVariant = 'primary' | 'cta' | 'secondary' | 'neutral' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const HEIGHT: Record<ButtonSize, number> = layout.button.height;

type VariantColors = { background?: string; border?: string; label: string };

type SharedButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  /**
   * A write is in flight. The button goes inert, which is what prevents the
   * double-submit, and dims slightly so the tap visibly registered. Expo UI's
   * universal set has no spinner, so show one beside the button if an action is
   * slow enough to need it.
   */
  loading?: boolean;
  /** A mark before the label, e.g. a provider logo on a social sign-up button. */
  icon?: NativeIconSource;
  /**
   * The colour behind the button. Outlined buttons need it on Android, where the
   * stroke is drawn by layering (see `buttonOutline.ts`). Defaults to the screen
   * background; pass the card or sheet colour when the button sits on one.
   */
  surface?: string;
  testID?: string;
};

export type ButtonCoreProps = SharedButtonProps & {
  /** Fixed width in points. Leave out to hug the label. */
  width?: number;
};

export function ButtonCore({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  surface,
  width,
  testID,
}: ButtonCoreProps) {
  const theme = useTheme();

  const height = HEIGHT[size];
  const radius =
    variant === 'neutral' ? layout.socialButton.radius : Math.min(layout.button.radius, height / 2);

  // One lookup rather than a chain of conditionals: adding a variant is one entry.
  const enabled: Record<ButtonVariant, VariantColors> = {
    primary: { background: theme.primary, label: theme.primaryForeground },
    cta: { background: theme.cta, label: theme.ctaForeground },
    secondary: { border: theme.primary, label: theme.primary },
    neutral: { border: theme.controlBorder, label: theme.foreground },
    ghost: { label: theme.foreground },
  };
  // Disabled, from the Create Account design: filled buttons keep their shape in a
  // muted fill, outlined ones keep their outline in the track colour, and every
  // label goes grey. No opacity, so the grey is the grey the design asked for.
  const inactive: Record<ButtonVariant, VariantColors> = {
    primary: { background: theme.surfaceMuted, label: theme.muted },
    cta: { background: theme.surfaceMuted, label: theme.muted },
    secondary: { border: theme.track, label: theme.muted },
    neutral: { border: theme.track, label: theme.muted },
    ghost: { label: theme.muted },
  };
  const { background, border, label: labelColor } = (disabled ? inactive : enabled)[variant];

  // Platform decides whether the stroke rides on `style` or on a SwiftUI modifier.
  const outline = resolveButtonOutline(
    border,
    layout.button.borderWidth,
    radius,
    surface ?? theme.background,
  );

  // A ghost button reads as a text link, so it sits flush with the content edge. The
  // native button's own content padding (Android) counts towards the design's 20pt.
  const paddingHorizontal =
    variant === 'ghost' ? 0 : Math.max(0, layout.button.paddingX - NATIVE_BUTTON_INSET);

  const text = (
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
  );

  return (
    <ExpoButton
      variant="text"
      onPress={onPress}
      disabled={disabled || loading}
      testID={testID}
      modifiers={outline.modifiers}
      style={{
        height,
        ...(width !== undefined ? { width } : null),
        paddingHorizontal,
        backgroundColor: background ?? outline.fill,
        borderRadius: radius,
        ...(outline.styleBorder ?? null),
        opacity: loading ? 0.7 : 1,
      }}
    >
      {icon ? (
        <Row alignment="center" spacing={layout.socialButton.iconGap}>
          <NativeIcon source={icon} size={layout.socialButton.iconSize} color={labelColor} />
          {text}
        </Row>
      ) : (
        text
      )}
    </ExpoButton>
  );
}

export type ButtonProps = SharedButtonProps & {
  fullWidth?: boolean;
};

export function Button({ fullWidth = false, size = 'md', ...props }: ButtonProps) {
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const height = HEIGHT[size];

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setMeasuredWidth(e.nativeEvent.layout.width);
  }, []);

  // A full-width button cannot render until it knows how wide its container is.
  const awaitingMeasure = fullWidth && measuredWidth === 0;

  return (
    <View
      onLayout={fullWidth ? handleLayout : undefined}
      style={{
        height,
        alignSelf: fullWidth ? 'stretch' : 'flex-start',
        // A ghost button's label sits on the content edge; on Android the native
        // button pads it inward, so the button reaches out by the same amount.
        marginHorizontal: props.variant === 'ghost' ? -NATIVE_BUTTON_INSET : 0,
      }}
    >
      {awaitingMeasure ? null : (
        <Host
          // A fresh native view per sizing mode — see note 2 above. Without this,
          // a Button reused from a hug-width slot keeps its old width.
          key={fullWidth ? 'fill' : 'hug'}
          matchContents={!fullWidth}
          style={fullWidth ? { height, width: '100%' } : { height }}
        >
          <ButtonCore {...props} size={size} width={fullWidth ? measuredWidth : undefined} />
        </Host>
      )}
    </View>
  );
}

/** Kept so a caller can reserve space for a button without importing the component. */
export const buttonMetrics = { height: HEIGHT } as const;
