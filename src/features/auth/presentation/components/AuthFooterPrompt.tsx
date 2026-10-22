import { View } from 'react-native';

import { Text, TextLink, type TextLinkEmphasis, type TextLinkTone } from '@shared/components';
import { MAX_LINK_SCALE } from '@shared/hooks/useFontScale';

/**
 * The one-line prompt that closes an auth screen: a muted sentence with a link
 * after it, centred — "Already have an account? SIGN IN", "Didn't get the code?
 * Resend code".
 *
 * The two halves wrap onto separate lines when they do not fit side by side —
 * at a larger text size, or in a longer language — instead of running off the
 * screen.
 *
 * `waiting` replaces the link with plain muted text while it cannot be used yet —
 * "Resend in 0:42" while a new code is not available. Its digits are
 * fixed-width so the line does not jitter as they change, and it is announced by
 * `waitingLabel` rather than read out every second.
 *
 * `emphasis` follows the design of the screen: the "options" screens set an
 * uppercase link in Plus Jakarta (`strong`); the stepped flows a sentence-case one
 * in the body face (`plain`, "Remember your password? Sign in").
 *
 * Placement is the screen's business: sign-up pins it near the home indicator,
 * the reset flow sits it under the button.
 */

export type AuthFooterPromptProps = {
  sentence: string;
  linkLabel: string;
  onPress: () => void;
  tone?: TextLinkTone;
  emphasis?: TextLinkEmphasis;
  /** Shown instead of the link while it is not available yet. */
  waiting?: string | null;
  /** What a screen reader says for `waiting`. */
  waitingLabel?: string;
  testID?: string;
};

export function AuthFooterPrompt({
  sentence,
  linkLabel,
  onPress,
  tone,
  emphasis,
  waiting,
  waitingLabel,
  testID,
}: AuthFooterPromptProps) {
  return (
    <View className="flex-row flex-wrap items-center justify-center gap-4">
      <Text variant="bodySm" tone="muted" className="text-center">
        {sentence}
      </Text>
      {waiting ? (
        <Text
          variant="labelSm"
          tone="muted"
          // Centred within its own box too: React Native can measure capped text at
          // the uncapped size, leaving the glyphs to one side of a wider box.
          className="text-center"
          style={{ fontVariant: ['tabular-nums'] }}
          // Grows only as far as the link it stands in for, so the line keeps its size.
          maxFontSizeMultiplier={MAX_LINK_SCALE}
          accessibilityLabel={waitingLabel}
          testID={testID ? `${testID}-waiting` : undefined}
        >
          {waiting}
        </Text>
      ) : (
        <TextLink label={linkLabel} onPress={onPress} tone={tone} emphasis={emphasis} testID={testID} />
      )}
    </View>
  );
}
