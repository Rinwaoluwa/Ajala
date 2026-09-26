import { View } from 'react-native';

import { Button, OtpInput, Screen, StatusSheet } from '@shared/components';

import { AuthIntro } from '../components/AuthIntro';
import { SignUpStepHeader } from '../components/SignUpStepHeader';
import { useEmailVerification } from '../hooks/useEmailVerification';

/**
 * Verification, step 2 of 3 (Figma "Create account" — Verification, empty and
 * filled, and modal-8 "Email verified!").
 *
 * Measured: the code boxes sit 24pt under the paragraph and Verify Code 24pt under
 * the boxes. Verify Code stays disabled until all six digits are in. A wrong code
 * empties the boxes and says why; a right one raises the success sheet, whose
 * Continue moves on to preferences.
 */

const SECTION_GAP = 28;
const CODE_GAP = 24;

export type VerifyEmailScreenProps = {
  onBack: () => void;
  onVerified: () => void;
};

export function VerifyEmailScreen({ onBack, onVerified }: VerifyEmailScreenProps) {
  const { otpRef, codeLength, maskedEmail, changeCode, error, canSubmit, submitting, submit, sheet } =
    useEmailVerification({ onVerified });

  return (
    <Screen edges={['top']} padded={false}>
      <SignUpStepHeader step={1} onBack={onBack} />

      <View className="px-20" style={{ paddingTop: SECTION_GAP }}>
        <AuthIntro
          title="Verification"
          body={`We sent a ${codeLength}-digit verification code to ${maskedEmail ?? 'your email'}.`}
        />

        <View style={{ marginTop: CODE_GAP }}>
          <OtpInput ref={otpRef} length={codeLength} onChange={changeCode} error={error} testID="verify-code" />
        </View>

        <View style={{ marginTop: CODE_GAP }}>
          <Button
            label="Verify Code"
            size="lg"
            fullWidth
            disabled={!canSubmit}
            loading={submitting}
            onPress={submit}
            testID="verify-submit"
          />
        </View>
      </View>

      <StatusSheet
        isPresented={sheet.isPresented}
        title="Email verified!"
        message="Your email has been verified successfully. Let's get your preferences set up."
        actionLabel="Continue"
        onAction={sheet.onContinue}
        onDismiss={sheet.onContinue}
      />
    </Screen>
  );
}
