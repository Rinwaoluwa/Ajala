import { TextInput, useNativeState, type ObservableState, type TextInputRef } from '@expo/ui';
import { useImperativeHandle, useRef, useState, type Ref } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@shared/hooks/useTheme';
import { layout } from '@shared/theme';

import { Text } from '../ui/Text';
import { Host } from '../ui/Host';

/**
 * A one-time-code entry: a row of boxes, one digit each.
 *
 * There is one real input, not six. An Expo UI `TextInput` (a native SwiftUI
 * TextField) lies over the whole row with transparent text and no caret, so a tap
 * anywhere focuses it, the number pad comes up, iOS can offer the code from
 * Messages (`one-time-code`), and pasting a whole code works. The boxes below are
 * a drawing of its value. Six separate inputs would break all three.
 *
 * Measured from the Verification design: boxes 50×56pt, 8pt apart, 8pt radius, a
 * muted fill with a 1pt outline. The box the next digit goes into gets a 2pt
 * ring just outside it — teal on light, Marigold on dark, as the two Verification
 * frames draw it. With all digits entered, the last box keeps the ring.
 */

const otp = layout.otp;
const RING = 2;

/**
 * Writes the native field's text. Expo UI state is a native shared object that is
 * meant to be written from JavaScript; it is not React state. The write lives here,
 * outside the component, because the React Compiler treats any object returned by
 * a hook as immutable.
 */
function writeNativeText(state: ObservableState<string>, value: string) {
  state.value = value;
}

export type OtpInputHandle = {
  focus: () => void;
  /** Puts the keyboard away, e.g. before a sheet opens over the screen. */
  blur: () => void;
  /** Empties every box, e.g. after a wrong code. */
  clear: () => void;
};

export type OtpInputProps = {
  ref?: Ref<OtpInputHandle>;
  length?: number;
  onChange?: (code: string) => void;
  /** Called once when the last digit is entered. */
  onComplete?: (code: string) => void;
  error?: string | null;
  autoFocus?: boolean;
  testID?: string;
};

export function OtpInput({
  ref,
  length = otp.length,
  onChange,
  onComplete,
  error,
  autoFocus = true,
  testID,
}: OtpInputProps) {
  const theme = useTheme();
  const inputRef = useRef<TextInputRef>(null);
  const text = useNativeState('');
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    blur: () => inputRef.current?.blur(),
    clear: () => {
      inputRef.current?.clear();
      setCode('');
      onChange?.('');
    },
  }));

  const handleChange = (raw: string) => {
    // Digits only, capped at the length. A paste of "123 456" becomes "123456".
    const digits = raw.replace(/\D/g, '').slice(0, length);
    if (digits !== raw) writeNativeText(text, digits);
    if (digits === code) return;
    setCode(digits);
    onChange?.(digits);
    if (digits.length === length) onComplete?.(digits);
  };

  const activeIndex = Math.min(code.length, length - 1);
  // The designed row (six 50pt cells) is wider than a narrow phone's column: the
  // cells shrink to share whatever width there is, never past the design.
  const designWidth = length * otp.cellWidth + (length - 1) * otp.gap;
  const [rowWidth, setRowWidth] = useState(designWidth);

  return (
    <View>
      <View
        style={{ width: '100%', maxWidth: designWidth, height: otp.cellHeight }}
        onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}
        accessible
        accessibilityLabel={`Verification code, ${code.length} of ${length} digits entered`}
      >
        <View style={{ flexDirection: 'row', gap: otp.gap }} importantForAccessibility="no-hide-descendants">
          {Array.from({ length }, (_, i) => {
            const isActive = focused && i === activeIndex;
            return (
              <View
                key={i}
                style={{
                  flex: 1,
                  maxWidth: otp.cellWidth,
                  height: otp.cellHeight,
                  borderRadius: otp.radius,
                  borderWidth: 1,
                  borderColor: error ? theme.destructive : theme.track,
                  backgroundColor: theme.surfaceMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isActive ? (
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      top: -RING - 1,
                      left: -RING - 1,
                      right: -RING - 1,
                      bottom: -RING - 1,
                      borderRadius: otp.radius + RING,
                      borderWidth: RING,
                      borderColor: theme.focusRing,
                    }}
                  />
                ) : null}
                <Text variant="code">{code[i] ?? ''}</Text>
              </View>
            );
          })}
        </View>

        {/* The real input, invisible, over the whole row. */}
        <Host style={StyleSheet.absoluteFill}>
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={handleChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoFocus={autoFocus}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            maxLength={length}
            caretHidden
            // The full row, not just the text's own width: on Android the Compose field
            // otherwise shrinks to its content and taps on the boxes miss it.
            style={{ width: rowWidth, height: otp.cellHeight }}
            textStyle={{ color: 'transparent', fontSize: 1 }}
            testID={testID}
          />
        </Host>
      </View>

      {error ? (
        <Text variant="bodyXs" tone="destructive" className="mt-8" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
