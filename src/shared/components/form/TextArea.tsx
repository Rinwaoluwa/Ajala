import { Host, TextInput, type TextInputRef } from '@expo/ui';
import { memo, useRef, useState } from 'react';

import { useFontScale } from '@shared/hooks/useFontScale';
import { useTheme } from '@shared/hooks/useTheme';
import { textStyles } from '@shared/theme';

import { multilineFieldBox } from '../ui/nativeFieldBox';
import { nativeTextScaleCap } from '../ui/nativeTextScale';
import { FIELD_LINE_HEIGHT, FieldFrame } from './FieldFrame';

/**
 * A labelled text box of several lines: a post's description ("Describe the
 * activity and who it's for."), a report's details.
 *
 * Expo UI's `TextInput` in multi-line mode inside the shared field chrome, so it
 * looks and behaves like `TextField` — uncontrolled (seed with `defaultValue`),
 * the outline teal while editing, an error or a `helper` ("0/500") below.
 *
 * The box reserves `lines` lines (about 150pt for the design's five), and grows
 * with the text-size setting so the reserved lines stay whole. Typing past them
 * scrolls inside the box.
 */

export type TextAreaProps = {
  label: string;
  placeholder?: string;
  defaultValue?: string;
  onChangeText?: (text: string) => void;
  onBlur?: () => void;
  error?: string | null;
  helper?: string | null;
  /** Lines the box shows before its text scrolls. */
  lines?: number;
  maxLength?: number;
  /** The pale filled box (the report sheet's details). */
  filled?: boolean;
  testID?: string;
};

function TextAreaComponent({
  label,
  placeholder,
  defaultValue,
  onChangeText,
  onBlur,
  error,
  helper,
  lines = 5,
  maxLength,
  filled = false,
  testID,
}: TextAreaProps) {
  const theme = useTheme();
  const inputRef = useRef<TextInputRef>(null);
  const [focused, setFocused] = useState(false);
  const scale = useFontScale();
  // Body text sits on a 24pt line in a multi-line box; the frame pads 10pt above and below.
  const height = Math.ceil(lines * (FIELD_LINE_HEIGHT + 4) * scale);
  // Text starts at the top of the box, not centred in it.
  const box = multilineFieldBox(height);

  return (
    <FieldFrame
      label={label}
      focused={focused}
      error={error}
      helper={helper}
      filled={filled}
      multiline
      minBoxHeight={height + 20}
      onPressBox={() => inputRef.current?.focus()}
      testID={testID}
    >
      <Host style={{ flex: 1, height }}>
        <TextInput
          ref={inputRef}
          multiline
          numberOfLines={lines}
          defaultValue={defaultValue}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          placeholder={placeholder}
          placeholderTextColor={theme.placeholder}
          maxLength={maxLength}
          cursorColor={theme.primary}
          style={box.style}
          modifiers={[...nativeTextScaleCap(), ...box.modifiers]}
          textStyle={{
            fontFamily: textStyles.bodySm.fontFamily,
            fontSize: textStyles.bodySm.fontSize,
            color: filled ? theme.chipForeground : theme.foreground,
          }}
          testID={testID ? `${testID}-input` : undefined}
        />
      </Host>
    </FieldFrame>
  );
}

/** Memoised for the same reason as `TextField`: it renders native views. */
export const TextArea = memo(TextAreaComponent);
