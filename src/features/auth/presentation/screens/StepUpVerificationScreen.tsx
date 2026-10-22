import { useEffect } from 'react';

import type { NextStep } from '../../domain/rules/accountRules';
import { CodeEntryForm } from '../components/CodeEntryForm';
import { CodeScreenLayout } from '../components/CodeScreenLayout';
import { signInCopy } from '../copy';
import { useStepUpVerification } from '../hooks/useStepUpVerification';

/**
 * Verification during sign-in, when the API answered 403 STEP_UP_REQUIRED
 * because the sign-in looked unusual (a new device, usually).
 *
 * Not drawn in Figma: the screen-to-API map says to reuse the Verification
 * screen, so this is that layout under the Sign In header.
 */

export type StepUpVerificationScreenProps = {
  onBack: () => void;
  onSignedIn: (next: NextStep) => void;
};

export function StepUpVerificationScreen({ onBack, onSignedIn }: StepUpVerificationScreenProps) {
  const { otpRef, entry, maskedEmail, hasChallenge } = useStepUpVerification({ onSignedIn });

  // Reached with nothing to answer (restored after the app was killed): the
  // password is gone from memory by design, so the only way on is back.
  useEffect(() => {
    if (!hasChallenge) onBack();
  }, [hasChallenge, onBack]);

  return (
    <CodeScreenLayout headerTitle={signInCopy.header} onBack={onBack}>
      <CodeEntryForm
        body={signInCopy.stepUpBody(entry.length, maskedEmail ?? signInCopy.stepUpFallbackRecipient)}
        otpRef={otpRef}
        entry={entry}
        testID="step-up"
      />
    </CodeScreenLayout>
  );
}
