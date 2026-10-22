import { Button as ExpoButton, Host, Text as ExpoText } from '@expo/ui';

import { useTheme } from '@shared/hooks/useTheme';
import { textStyles } from '@shared/theme';

import { NATIVE_BUTTON_INSET } from './nativeButtonInset';
import { nativeTextScaleCap } from './nativeTextScale';

/**
 * A short tappable phrase, such as "SIGN IN" at the end of "Already have an
 * account?".
 *
 * Plus Jakarta 600 at 14pt. A native Expo UI button, so it gets platform press
 * feedback and reads as a button to VoiceOver. It hugs its label, so place it in a
 * row beside the sentence it finishes.
 *
 * `emphasis` picks the weight: `strong` is the uppercase footer link the designs
 * set in Plus Jakarta 600; `plain` is an inline link that sits in running text,
 * like "Forgot password?", and matches the body face around it.
 *
 * `tone` picks the colour, because the designs use three:
 *   - `link` (default): Teal on light, Marigold on dark — the sign-up flow.
 *   - `accent`: Marigold in both schemes — the password-reset flow.
 *   - `foreground`: ink, for a link that reads as plain text ("Forgot password?").
 *
 * ACCESSIBILITY: `accent` on a light background is Marigold on white, about
 * 1.8:1. That is what the password-reset design shows, but it fails WCAG for text
 * and the brand brief says Marigold is never body text. Flagged to design.
 */

export type TextLinkTone = 'link' | 'accent' | 'foreground';
export type TextLinkEmphasis = 'strong' | 'plain';

export type TextLinkProps = {
  label: string;
  onPress: () => void;
  tone?: TextLinkTone;
  emphasis?: TextLinkEmphasis;
  testID?: string;
};

export function TextLink({
  label,
  onPress,
  tone = 'link',
  emphasis = 'strong',
  testID,
}: TextLinkProps) {
  const theme = useTheme();
  const color: Record<TextLinkTone, string> = {
    link: theme.link,
    accent: theme.accent,
    foreground: theme.foreground,
  };
  const face: Record<TextLinkEmphasis, { fontFamily: string; fontWeight: '500' | '600' }> = {
    strong: { fontFamily: textStyles.headingSm.fontFamily, fontWeight: '600' },
    plain: { fontFamily: textStyles.labelSm.fontFamily, fontWeight: '500' },
  };

  return (
    // The negative margin cancels the native button's own content padding (Android),
    // so the link sits beside its sentence as it does on iOS.
    <Host matchContents style={{ marginHorizontal: -NATIVE_BUTTON_INSET }}>
      <ExpoButton
        variant="text"
        onPress={onPress}
        // Grows with the text-size setting, a step short of body text: a link hugs
        // its label on one line, so it has to stay narrower than the screen.
        modifiers={nativeTextScaleCap('link')}
        testID={testID}
      >
        <ExpoText
          textStyle={{
            fontFamily: face[emphasis].fontFamily,
            fontSize: textStyles.bodySm.fontSize,
            lineHeight: textStyles.bodySm.lineHeight,
            fontWeight: face[emphasis].fontWeight,
            color: color[tone],
          }}
        >
          {label}
        </ExpoText>
      </ExpoButton>
    </Host>
  );
}
