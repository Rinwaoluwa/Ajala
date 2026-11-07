import type { RefObject } from 'react';
import { View } from 'react-native';

import { Button, OtpInput, Text, type OtpInputHandle } from '@shared/components';
import { formatCountdown } from '@shared/hooks/useCountdown';

import { codeEntryCopy } from '../copy';
import type { CodeEntryState } from '../hooks/useCodeEntry';
import { AuthFooterPrompt } from './AuthFooterPrompt';
import { AuthIntro, type AuthIntroTone } from './AuthIntro';

/**
 * The body of the Verification screen (Figma "Create account" — Verification):
 * heading and paragraph, the code boxes 24pt below, "Verify code" 24pt below
 * those, then "Didn't get the code? Resend code" where the flow can send another —
 * counting down ("Resend in 0:42") until it may.
 *
 * The prompt's link is sentence case in the body face and the text colour, as the
 * Verification frames set it, rather than the uppercase teal of the options
 * screens.
 *
 * Every code the API asks for uses this one layout — sign-up verification,
 * sign-in step-up, linking Google or Apple to an existing account, and the
 * password-reset code — as the
 * screen-to-API map directs ("reuse the Verification screen").
 */

const CODE_GAP = 24;
const PROMPT_GAP = 20;

export type CodeEntryFormProps = {
  title?: string;
  body: string;
  /** The masked address, set apart at the end of `body`. */
  emphasis?: string;
  tone?: AuthIntroTone;
  /** Kept apart from `entry` so the form's render reads plain state, never a ref. */
  otpRef: RefObject<OtpInputHandle | null>;
  entry: CodeEntryState;
  testID: string;
};

export function CodeEntryForm({
  title = codeEntryCopy.title,
  body,
  emphasis,
  tone,
  otpRef,
  entry,
  testID,
}: CodeEntryFormProps) {
  return (
    <View>
      <AuthIntro title={title} body={body} emphasis={emphasis} tone={tone} />

      <View style={{ marginTop: CODE_GAP }}>
        <OtpInput
          ref={otpRef}
          length={entry.length}
          onChange={entry.changeCode}
          error={entry.error}
          testID={`${testID}-code`}
        />
      </View>

      <View style={{ marginTop: CODE_GAP }}>
        <Button
          label={codeEntryCopy.submit}
          size="lg"
          fullWidth
          disabled={!entry.canSubmit}
          loading={entry.submitting}
          onPress={entry.submit}
          testID={`${testID}-submit`}
        />
      </View>

      {entry.resend ? (
        <View style={{ marginTop: PROMPT_GAP }}>
          <AuthFooterPrompt
            sentence={codeEntryCopy.resendPrompt}
            linkLabel={codeEntryCopy.resendLink}
            tone="foreground"
            emphasis="plain"
            onPress={entry.resend.onPress}
            // Until a new code may be asked for, a countdown stands in for the link.
            waiting={
              entry.resend.availableIn > 0
                ? codeEntryCopy.resendWaiting(formatCountdown(entry.resend.availableIn))
                : null
            }
            waitingLabel={codeEntryCopy.resendWaitingLabel(entry.resend.availableIn)}
            testID={`${testID}-resend`}
          />
        </View>
      ) : null}

      {entry.notice ? (
        <Text
          variant="bodySm"
          tone="muted"
          className="mt-12 text-center"
          accessibilityLiveRegion="polite"
        >
          {entry.notice}
        </Text>
      ) : null}
    </View>
  );
}
