import { TextInput, type TextInputRef } from '@expo/ui';
import { memo, useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';

import { useAppColorScheme } from '@shared/hooks/useAppColorScheme';
import { useFontScale } from '@shared/hooks/useFontScale';
import { useLiquidGlass } from '@shared/hooks/useLiquidGlass';
import { useTheme } from '@shared/hooks/useTheme';
import { textStyles } from '@shared/theme';

import { GlassBackdrop } from '../surface/GlassBackdrop';
import { Host } from '../ui/Host';
import { composeLines } from '../ui/nativeComposeLines';
import { nativeTextScaleCap } from '../ui/nativeTextScale';

/**
 * The box something is written in to be sent: a chat message, a comment.
 *
 * One rounded surface that floats over the page. The words are on top, on a
 * line that grows with them (to five, then it scrolls); under them, a row of
 * round buttons: what can be added on the left (`leading`), send on the right
 * (`trailing`). Whatever is waiting to go with the words (photos, "Replying to
 * …") sits `above` them, inside the box.
 *
 * The surface is the tab bar's: frosted Liquid Glass with a faint base, a
 * hairline edge and a soft shadow where the phone has glass; the card colour
 * with the same edge where it has not. What scrolls under it stays readable.
 *
 * A touch anywhere on the box starts typing. The keyboard's return key sends
 * (`onSubmit`); the field is uncontrolled, so remount it (`key`) to empty it.
 * Text follows the text-size setting, and the box grows with it.
 */

/** The corner of the box; its buttons are circles of `COMPOSE_BUTTON`. */
const RADIUS = 26;
export const COMPOSE_BUTTON = 40;
const MAX_LINES = 5;

export type ComposeBoxProps = {
  placeholder: string;
  onChangeText: (text: string) => void;
  /** The keyboard's Send key. */
  onSubmit: () => void;
  maxLength?: number;
  /** Inside the box, over the words: photos waiting to go, who is being answered. */
  above?: ReactNode;
  /** The foot of the box, left: what can be added, or whose words these are. */
  leading?: ReactNode;
  /** The foot of the box, right: send. */
  trailing?: ReactNode;
  testID?: string;
};

function ComposeBoxComponent({
  placeholder,
  onChangeText,
  onSubmit,
  maxLength,
  above,
  leading,
  trailing,
  testID,
}: ComposeBoxProps) {
  const theme = useTheme();
  const dark = useAppColorScheme() === 'dark';
  const glass = useLiquidGlass();
  const input = useRef<TextInputRef>(null);
  const scale = useFontScale();
  const lineHeight = Math.ceil(textStyles.bodyMd.lineHeight * scale);
  const lines = composeLines(MAX_LINES, lineHeight);

  return (
    <View
      style={{
        borderRadius: RADIUS,
        // The shadow is the box's own, outside it: a clipped view cannot cast one.
        boxShadow: dark ? '0 6px 18px rgba(0,0,0,0.38)' : '0 6px 18px rgba(16,24,40,0.12)',
      }}
    >
      <Pressable
        // Not a button to a screen reader: the field inside is what it lands on.
        accessible={false}
        onPress={() => input.current?.focus()}
        style={{
          borderRadius: RADIUS,
          overflow: 'hidden',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: dark ? 'rgba(255,255,255,0.18)' : 'rgba(17,24,39,0.14)',
          backgroundColor: glass ? (dark ? 'rgba(17,20,23,0.28)' : 'rgba(255,255,255,0.24)') : theme.card,
          paddingHorizontal: 12,
          paddingTop: 12,
          paddingBottom: 10,
          gap: 10,
        }}
        testID={testID}
      >
        {glass ? (
          <GlassBackdrop variant="regular" tint={null} shape={{ capsule: false, radius: RADIUS }} appearance="auto" />
        ) : null}
        {above}
        <Host matchContents={{ vertical: true }} style={[{ alignSelf: 'stretch', marginHorizontal: 6 }, lines.style]}>
          <TextInput
            ref={input}
            multiline
            onChangeText={onChangeText}
            onSubmitEditing={onSubmit}
            returnKeyType="send"
            placeholder={placeholder}
            placeholderTextColor={theme.placeholder}
            maxLength={maxLength}
            cursorColor={theme.primary}
            modifiers={[...nativeTextScaleCap(), ...lines.modifiers]}
            textStyle={{
              fontFamily: textStyles.bodyMd.fontFamily,
              fontSize: textStyles.bodyMd.fontSize,
              color: theme.foreground,
            }}
            testID={testID ? `${testID}-input` : undefined}
          />
        </Host>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>{leading}</View>
          {trailing}
        </View>
      </Pressable>
    </View>
  );
}

/** Memoised: it renders native views, and its screen re-renders as messages arrive. */
export const ComposeBox = memo(ComposeBoxComponent);

/**
 * A round button at the foot of a `ComposeBox`. `plain` is something to add
 * (the "+"); `primary` is send, filled once there is something to send
 * (`active`) and quiet until then.
 */
export function ComposeButton({
  onPress,
  accessibilityLabel,
  tone = 'plain',
  active = true,
  disabled = false,
  children,
  testID,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  tone?: 'plain' | 'primary';
  /** `primary` only: there is something to send. */
  active?: boolean;
  disabled?: boolean;
  /** The glyph. Give it `composeButtonTint` so it follows the button's state. */
  children: ReactNode;
  testID?: string;
}) {
  const theme = useTheme();
  const filled = tone === 'primary' && active;
  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: disabled || (tone === 'primary' && !active) }}
      testID={testID}
      style={{
        width: COMPOSE_BUTTON,
        height: COMPOSE_BUTTON,
        borderRadius: COMPOSE_BUTTON / 2,
        backgroundColor: filled ? theme.primaryFill : theme.surfaceMuted,
        opacity: disabled && tone === 'plain' ? 0.4 : 1,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </TouchableOpacity>
  );
}
