import { Host, TextInput, type TextInputRef } from '@expo/ui';
import { memo, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Platform, Pressable } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useFontScale } from '@shared/hooks/useFontScale';
import { useTheme } from '@shared/hooks/useTheme';
import { layout, textStyles } from '@shared/theme';

import { NATIVE_BUTTON_INSET } from '../ui/nativeButtonInset';
import { nativeTextScaleCap } from '../ui/nativeTextScale';
import { FieldFrame, fieldLineHeight } from './FieldFrame';

/**
 * A labelled single-line text field. The input is Expo UI's `TextInput` — a real
 * SwiftUI `TextField` / Compose `TextField` — inside the shared field chrome.
 *
 * Uncontrolled: the native field owns its text and reports each change through
 * `onChangeText`. Seed it with `defaultValue`. That keeps typing on the native side
 * with no round trip through React on every keystroke.
 *
 * `trailing` is Expo UI content drawn at the right edge. It is hosted separately
 * and hugs its content. On its own it is a native control (it brings its own
 * button). With `trailingAction` it is only a glyph, and the field makes it a
 * button with a platform-size tap area around it (the password field's eye).
 */

type NativeInputProps = ComponentProps<typeof TextInput>;

export type TextFieldProps = {
  label: string;
  placeholder?: string;
  defaultValue?: string;
  onChangeText?: (text: string) => void;
  onSubmitEditing?: () => void;
  /** Called when the field loses focus — the usual moment to show a format error. */
  onBlur?: () => void;
  error?: string | null;
  secureTextEntry?: boolean;
  keyboardType?: NativeInputProps['keyboardType'];
  autoCapitalize?: NativeInputProps['autoCapitalize'];
  autoComplete?: NativeInputProps['autoComplete'];
  autoCorrect?: boolean;
  returnKeyType?: NativeInputProps['returnKeyType'];
  trailing?: ReactNode;
  /** Makes `trailing` (then a plain glyph) a button. */
  trailingAction?: TrailingAction;
  testID?: string;
};

export type TrailingAction = {
  onPress: () => void;
  accessibilityLabel: string;
  testID?: string;
};

function TextFieldComponent({
  label,
  placeholder,
  defaultValue,
  onChangeText,
  onSubmitEditing,
  onBlur,
  error,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  autoComplete,
  autoCorrect,
  returnKeyType,
  trailing,
  trailingAction,
  testID,
}: TextFieldProps) {
  const theme = useTheme();
  const inputRef = useRef<TextInputRef>(null);
  const [focused, setFocused] = useState(false);
  // The native text follows the text-size setting; its line has to grow with it.
  const lineHeight = fieldLineHeight(useFontScale());

  return (
    <FieldFrame
      label={label}
      focused={focused}
      error={error}
      hasTrailing={trailing != null}
      onPressBox={() => inputRef.current?.focus()}
      testID={testID}
    >
      <Host style={{ flex: 1, height: lineHeight }}>
        <TextInput
          ref={inputRef}
          defaultValue={defaultValue}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmitEditing ? () => onSubmitEditing() : undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          placeholder={placeholder}
          placeholderTextColor={theme.placeholder}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoCorrect={autoCorrect}
          returnKeyType={returnKeyType}
          cursorColor={theme.primary}
          style={{ height: lineHeight }}
          modifiers={nativeTextScaleCap()}
          textStyle={{
            fontFamily: textStyles.bodySm.fontFamily,
            fontSize: textStyles.bodySm.fontSize,
            color: theme.foreground,
          }}
          testID={testID ? `${testID}-input` : undefined}
        />
      </Host>
      {trailing != null && trailingAction ? (
        <TrailingButton action={trailingAction}>{trailing}</TrailingButton>
      ) : trailing != null ? (
        // Trailing content is a native button; cancel its own padding (Android) so the
        // icon sits the design's distance from the edge.
        <Host matchContents style={{ marginRight: -NATIVE_BUTTON_INSET }}>
          {trailing}
        </Host>
      ) : null}
    </FieldFrame>
  );
}

/** The box the design gives a trailing glyph; the field's height is set around it. */
const TRAILING_GLYPH_BOX = 20;
const TOUCH_TARGET = Platform.OS === 'android' ? layout.touchTarget.android : layout.touchTarget.ios;
/** How far the tap area reaches past the glyph box on each side. */
const TRAILING_SLOP = (TOUCH_TARGET - TRAILING_GLYPH_BOX) / 2;
const PRESS_DIM = 0.4;
const PRESS_SETTLE_MS = 200;

/**
 * A trailing glyph as a button: the glyph keeps its drawn size and place, and the
 * tap area reaches `TRAILING_SLOP` past it on every side, so it is a full 44pt
 * (iOS) / 48dp (Android) target. On Android the field's box bounds it vertically:
 * touches cannot land outside a parent there.
 *
 * A tap dims the glyph and settles it back, with a slight scale up from 90%. It
 * lands as the glyph changes, so the swap reads as a response to the tap rather
 * than a jump. With Reduce Motion the scale is dropped and only the fade stays.
 */
function TrailingButton({ action, children }: { action: TrailingAction; children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const settle = useSharedValue(1);

  const glyphStyle = useAnimatedStyle(() => ({
    opacity: PRESS_DIM + (1 - PRESS_DIM) * settle.value,
    transform: reduceMotion ? [] : [{ scale: 0.9 + 0.1 * settle.value }],
  }));

  const press = () => {
    settle.value = withSequence(
      withTiming(0, { duration: 0 }),
      withTiming(1, { duration: PRESS_SETTLE_MS, easing: Easing.out(Easing.quad) }),
    );
    action.onPress();
  };

  return (
    <Pressable
      onPress={press}
      hitSlop={TRAILING_SLOP}
      accessibilityRole="button"
      accessibilityLabel={action.accessibilityLabel}
      testID={action.testID}
      style={{ width: TRAILING_GLYPH_BOX, height: TRAILING_GLYPH_BOX }}
    >
      {/* The native view must not take the touch; the Pressable around it does. */}
      <Animated.View
        pointerEvents="none"
        style={[{ flex: 1, alignItems: 'center', justifyContent: 'center' }, glyphStyle]}
      >
        <Host matchContents>{children}</Host>
      </Animated.View>
    </Pressable>
  );
}

/**
 * Memoised: this renders native Expo UI views, so re-rendering it for a change
 * elsewhere on the form does real native work. Its props are stable by
 * construction — see the hooks that build them.
 */
export const TextField = memo(TextFieldComponent);
