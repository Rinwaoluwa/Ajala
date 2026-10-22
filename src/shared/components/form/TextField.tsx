import { Host, TextInput, type TextInputRef } from '@expo/ui';
import { memo, useRef, useState, type ComponentProps, type ReactNode } from 'react';

import { useFontScale } from '@shared/hooks/useFontScale';
import { useTheme } from '@shared/hooks/useTheme';
import { textStyles } from '@shared/theme';

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
 * `trailing` is Expo UI content drawn at the right edge (the password field's eye
 * toggle). It is hosted separately and hugs its content.
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
      {trailing != null ? (
        // Trailing content is a native button; cancel its own padding (Android) so the
        // icon sits the design's distance from the edge.
        <Host matchContents style={{ marginRight: -NATIVE_BUTTON_INSET }}>
          {trailing}
        </Host>
      ) : null}
    </FieldFrame>
  );
}

/**
 * Memoised: this renders native Expo UI views, so re-rendering it for a change
 * elsewhere on the form does real native work. Its props are stable by
 * construction — see the hooks that build them.
 */
export const TextField = memo(TextFieldComponent);
