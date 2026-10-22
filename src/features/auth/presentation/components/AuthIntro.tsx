import { View } from 'react-native';

import { Text } from '@shared/components';

/**
 * The heading and lead paragraph at the top of an auth screen: Plus Jakarta
 * 32/40, then Inter 16/24, 8pt apart.
 *
 * `tone` picks the colours, because the designs use three:
 *   - `heading` (default): brand teal heading, body in the text colour — the
 *     sign-up flow and the two "options" screens, in both schemes.
 *   - `inkOnLight`: ink heading over a muted body on light, but teal heading over
 *     a Mist body on dark — the password reset. Its light and dark frames really
 *     do differ (Figma "Forgot password" light vs dark), so the dark half rides on
 *     `dark:` classes rather than a token of its own.
 *   - `default`: ink heading in both schemes — Sign In, whose dark frame is not
 *     drawn.
 *
 * `emphasis` finishes the paragraph with a value set apart from it — the masked
 * address on the Verification screens ("…code to S•••••@email.com."): ink on light,
 * Teal Light on dark, as both Verification frames draw it.
 */

export type AuthIntroTone = 'heading' | 'inkOnLight' | 'default';

export type AuthIntroProps = {
  title: string;
  body: string;
  /** Appended to `body` after a space, in the emphasis colour. */
  emphasis?: string;
  tone?: AuthIntroTone;
};

const titleClass: Record<AuthIntroTone, string | undefined> = {
  heading: undefined,
  inkOnLight: 'dark:text-heading',
  default: undefined,
};

// Each element takes one base tone through `Text` and at most a `dark:` override
// on top. Two base colour classes on one element would be decided by stylesheet
// order, not by intent.
const bodyClass: Record<AuthIntroTone, string | undefined> = {
  heading: undefined,
  inkOnLight: 'dark:text-foreground',
  default: undefined,
};

export function AuthIntro({ title, body, emphasis, tone = 'heading' }: AuthIntroProps) {
  return (
    <View>
      <Text
        variant="headingXxl"
        tone={tone === 'heading' ? 'heading' : 'default'}
        className={titleClass[tone]}
        accessibilityRole="header"
      >
        {title}
      </Text>
      <View className="mt-8">
        <Text variant="bodyMd" tone={tone === 'inkOnLight' ? 'muted' : 'default'} className={bodyClass[tone]}>
          {body}
          {emphasis ? (
            <Text variant="bodyMd" className="dark:text-primary">
              {` ${emphasis}`}
            </Text>
          ) : null}
        </Text>
      </View>
    </View>
  );
}
