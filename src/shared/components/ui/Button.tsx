import { Button as ExpoButton, Host, Row, Text as ExpoText } from '@expo/ui';
import { useCallback, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';

import { useTheme } from '@shared/hooks/useTheme';
import { layout, textStyles } from '@shared/theme';

import { buttonHitArea } from './buttonHitArea';
import { a11yLabel } from './nativeA11y';
import { resolveButtonOutline } from './buttonOutline';
import { NativeIcon, type NativeIconSource } from './NativeIcon';
import { NativeSpinner } from './NativeSpinner';
import { NATIVE_BUTTON_INSET, NATIVE_BUTTON_INSET_VERTICAL } from './nativeButtonInset';
import { nativeLineBox } from './nativeLineBox';
import { nativeTextScaleCap } from './nativeTextScale';

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
 *
 * LARGER TEXT. The label follows the text-size setting (to 2×, see
 * `nativeTextScale`). So the button is sized by padding around its label, not by
 * a fixed height: at the default size that padding gives exactly the design's
 * height, and at larger sizes the button grows — and a long label wraps onto a
 * second line — instead of clipping. The Host reports the native height back to
 * React Native (`matchContents` vertically), and the wrapper keeps the designed
 * height as a minimum.
 */

export type ButtonVariant = 'primary' | 'cta' | 'secondary' | 'neutral' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const HEIGHT: Record<ButtonSize, number> = layout.button.height;

const ignorePress = () => undefined;

/**
 * The label's line as the platform draws it (`Label/Small`, 14/20): the padding
 * around it makes up the rest of the button's height.
 */
const LABEL_LINE = nativeLineBox(textStyles.labelSm.fontSize, textStyles.labelSm.lineHeight);

/** Sized to sit level with the 14/20 label. */
const SPINNER_SIZE = 16;
const SPINNER_GAP = 8;

type VariantColors = { background?: string; border?: string; label: string };

type SharedButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  /**
   * A request is in flight. The button goes inert, which is what prevents the
   * double-submit, and shows a native spinner inside it, before the label (in
   * place of the icon, if it has one), so the wait reads as "working" rather
   * than "nothing happened". It keeps its enabled colours: it is busy, not off.
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
  /**
   * A filled button in a colour that is not a variant — the status sheets' info,
   * warning and error actions. Replaces the variant's enabled fill and label;
   * disabled still uses the variant's muted look.
   */
  tint?: { fill: string; label: string };
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
  tint,
  testID,
}: ButtonCoreProps) {
  const theme = useTheme();

  const height = HEIGHT[size];
  const radius =
    variant === 'neutral' ? layout.socialButton.radius : Math.min(layout.button.radius, height / 2);

  // One lookup rather than a chain of conditionals: adding a variant is one entry.
  const enabled: Record<ButtonVariant, VariantColors> = {
    primary: { background: theme.primaryFill, label: theme.primaryFillForeground },
    cta: { background: theme.cta, label: theme.ctaForeground },
    // The dark welcome design labels this in brand teal, which is 3:1 on Night —
    // too faint for 14pt text — so the label takes Teal Light there instead.
    secondary: { border: theme.outline, label: theme.primary },
    neutral: { border: theme.controlBorder, label: theme.foreground },
    ghost: { label: theme.foreground },
  };
  // Disabled, from the Create Account design: filled buttons keep their shape in a
  // muted fill, outlined ones keep their outline in the track colour, and every
  // label goes grey. No opacity, so the grey is the grey the design asked for.
  // Filled ones stay a light pill in dark mode too, as the dark frames draw them.
  const inactive: Record<ButtonVariant, VariantColors> = {
    primary: { background: theme.disabledFill, label: theme.disabledForeground },
    cta: { background: theme.disabledFill, label: theme.disabledForeground },
    secondary: { border: theme.track, label: theme.muted },
    neutral: { border: theme.track, label: theme.muted },
    ghost: { label: theme.muted },
  };
  const { background, border, label: labelColor } = disabled
    ? inactive[variant]
    : tint
      ? { background: tint.fill, border: undefined, label: tint.label }
      : enabled[variant];

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

  // What the padding wraps: the label's line, or the mark beside it if that is
  // taller (the 18pt provider logos). Kept while the spinner stands in for the
  // mark, so a busy button does not change height.
  const contentHeight = icon ? Math.max(LABEL_LINE, layout.socialButton.iconSize) : LABEL_LINE;

  // The spinner takes the icon's slot, so a button with a mark does not grow.
  const leading = loading ? (
    <NativeSpinner size={SPINNER_SIZE} color={labelColor} />
  ) : icon ? (
    <NativeIcon source={icon} size={layout.socialButton.iconSize} color={labelColor} />
  ) : null;

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
      // While loading the button stays enabled and swallows taps instead. Disabling
      // it would make SwiftUI dim the label and spinner to a faded grey, which reads
      // as "unavailable" — the opposite of "working, please wait".
      onPress={loading ? ignorePress : onPress}
      disabled={disabled}
      testID={testID}
      modifiers={[
        ...(outline.modifiers ?? []),
        ...buttonHitArea(radius),
        // The label grows with the text-size setting, up to the shared ceiling.
        ...nativeTextScaleCap(),
        // The spinner is silent to VoiceOver, so the label says it instead.
        ...(loading ? a11yLabel(`${label}, loading`) : []),
      ]}
      style={{
        // Padding, not a fixed height: equals the design's height at the default
        // text size and grows with the label beyond it.
        paddingVertical: Math.max(0, (height - contentHeight) / 2 - NATIVE_BUTTON_INSET_VERTICAL),
        ...(width !== undefined ? { width } : null),
        paddingHorizontal,
        backgroundColor: background ?? outline.fill,
        borderRadius: radius,
        ...(outline.styleBorder ?? null),
      }}
    >
      {leading ? (
        <Row alignment="center" spacing={icon ? layout.socialButton.iconGap : SPINNER_GAP}>
          {leading}
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
        minHeight: height,
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
          // Height always follows the native button, so it can grow with the label.
          matchContents={fullWidth ? { vertical: true } : true}
          style={fullWidth ? { width: '100%' } : undefined}
        >
          <ButtonCore {...props} size={size} width={fullWidth ? measuredWidth : undefined} />
        </Host>
      )}
    </View>
  );
}

/**
 * Kept so a caller can reserve space for a button without importing the component.
 * `heightAt` is the height at a text-size scale (`useFontScale()`): the label's
 * line grows and the padding around it does not.
 */
export const buttonMetrics = {
  height: HEIGHT,
  heightAt: (size: ButtonSize, scale: number) => Math.ceil(HEIGHT[size] + LABEL_LINE * (scale - 1)),
} as const;
