import { Host, TextInput, type TextInputRef } from '@expo/ui';
import { useRef, useState, type ComponentProps, type ReactNode } from 'react';

import { useTheme } from '@shared/hooks/useTheme';
import { textStyles } from '@shared/theme';

import { NATIVE_BUTTON_INSET } from '../ui/nativeButtonInset';
import { FIELD_LINE_HEIGHT, FieldFrame } from './FieldFrame';

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

export function TextField({
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

  return (
    <FieldFrame
      label={label}
      focused={focused}
      error={error}
      hasTrailing={trailing != null}
      onPressBox={() => inputRef.current?.focus()}
      testID={testID}
    >
      <Host style={{ flex: 1, height: FIELD_LINE_HEIGHT }}>
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
          style={{ height: FIELD_LINE_HEIGHT }}
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
