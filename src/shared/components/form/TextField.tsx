import { TextInput, type TextInputRef } from '@expo/ui';
import { memo, useCallback, useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
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

import { nativeTextScaleCap } from '../ui/nativeTextScale';
import { Text } from '../ui/Text';
import { FieldFrame, fieldLineHeight } from './FieldFrame';
import { Host } from '../ui/Host';

/**
 * A labelled single-line text field. The input is Expo UI's `TextInput` — a real
 * SwiftUI `TextField` / Compose `TextField` — inside the shared field chrome.
 *
 * Uncontrolled: the native field owns its text and reports each change through
 * `onChangeText`. Seed it with `defaultValue`. That keeps typing on the native side
 * with no round trip through React on every keystroke.
 *
 * `trailing` is an Expo UI glyph drawn at the right edge, hosted separately and
 * hugging its content. On its own it is a status mark (the handle's check). With
 * `trailingAction` the field makes it a button with a platform-size tap area
 * around it (the password field's eye). `leading` and `prefix` sit before the text.
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
  /** Muted text under the box while there is no error, e.g. "0/100". */
  helper?: string | null;
  secureTextEntry?: boolean;
  keyboardType?: NativeInputProps['keyboardType'];
  autoCapitalize?: NativeInputProps['autoCapitalize'];
  autoComplete?: NativeInputProps['autoComplete'];
  autoCorrect?: boolean;
  returnKeyType?: NativeInputProps['returnKeyType'];
  trailing?: ReactNode;
  /** Makes `trailing` (then a plain glyph) a button. */
  trailingAction?: TrailingAction;
  /** A glyph before the text (Expo UI content), e.g. the search field's magnifier. */
  leading?: ReactNode;
  /** Fixed text before what is typed, e.g. "@" before a handle. */
  prefix?: string;
  /** The pale filled box (see `FieldFrame`). */
  filled?: boolean;
  /** No outline or fill: the field's surface is drawn around it (see `FieldFrame`). */
  bare?: boolean;
  /** Not drawn — a search box whose placeholder names it, which the native field reads out. */
  labelHidden?: boolean;
  autoFocus?: boolean;
  maxLength?: number;
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
  helper,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  autoComplete,
  autoCorrect,
  returnKeyType,
  trailing,
  trailingAction,
  leading,
  prefix,
  filled = false,
  bare = false,
  labelHidden = false,
  autoFocus,
  maxLength,
  testID,
}: TextFieldProps) {
  const theme = useTheme();
  const inputRef = useRef<TextInputRef>(null);
  // Always registered, forwarding to whatever `onSubmitEditing` is now. The native
  // field adds its submit modifier only while it has a handler, and adding or
  // removing it rebuilds the field — dropping focus and the keyboard mid-typing
  // whenever a form flips between "can submit" and "can't".
  const submitRef = useRef(onSubmitEditing);
  useEffect(() => {
    submitRef.current = onSubmitEditing;
  }, [onSubmitEditing]);
  const handleSubmit = useCallback(() => submitRef.current?.(), []);
  const [focused, setFocused] = useState(false);
  // The native text follows the text-size setting; its line has to grow with it.
  const lineHeight = fieldLineHeight(useFontScale());
  const textColor = filled && !bare ? theme.chipForeground : theme.foreground;

  return (
    <FieldFrame
      label={label}
      focused={focused}
      error={error}
      helper={helper}
      hasTrailing={trailing != null}
      filled={filled}
      bare={bare}
      labelHidden={labelHidden}
      onPressBox={() => inputRef.current?.focus()}
      testID={testID}
    >
      {leading != null ? (
        <Host matchContents style={{ marginRight: 8 }} pointerEvents="none">
          {leading}
        </Host>
      ) : null}
      {prefix ? (
        <Text
          variant="bodySm"
          style={{ color: textColor }}
          importantForAccessibility="no"
          accessibilityElementsHidden
        >
          {prefix}
        </Text>
      ) : null}
      <Host style={{ flex: 1, height: lineHeight }}>
        <TextInput
          ref={inputRef}
          defaultValue={defaultValue}
          onChangeText={onChangeText}
          onSubmitEditing={handleSubmit}
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
          autoFocus={autoFocus}
          maxLength={maxLength}
          returnKeyType={returnKeyType}
          cursorColor={theme.primary}
          style={{ height: lineHeight }}
          modifiers={nativeTextScaleCap()}
          textStyle={{
            fontFamily: textStyles.bodySm.fontFamily,
            fontSize: textStyles.bodySm.fontSize,
            color: textColor,
          }}
          testID={testID ? `${testID}-input` : undefined}
        />
      </Host>
      {trailing != null && trailingAction ? (
        <TrailingButton action={trailingAction}>{trailing}</TrailingButton>
      ) : trailing != null ? (
        // A status glyph (the handle's check, a spinner); it takes no touches.
        <Host matchContents pointerEvents="none" ignoreSafeArea="all">
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
