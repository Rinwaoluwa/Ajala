import { View } from 'react-native';

import { Screen, StatusSheet } from '@shared/components';

import type { NextStep } from '../../domain/rules/accountRules';
import { CodeEntryForm } from '../components/CodeEntryForm';
import { SignUpStepHeader } from '../components/SignUpStepHeader';
import { verifyEmailCopy as copy } from '../copy';
import { useEmailVerification } from '../hooks/useEmailVerification';

/**
 * Verification, step 2 of 3 (Figma "Create account" — Verification, empty and
 * filled, and modal-8 "Email verified!" / "Email verification failed").
 *
 * Measured: the code boxes sit 24pt under the paragraph and "Verify code" 24pt
 * under the boxes. It stays disabled until all six digits are in. A wrong code
 * empties the boxes and raises the failure sheet; a right one raises the success
 * sheet, whose Continue moves on to wherever `GET /me` says — profile setup for a
 * new account.
 */

const SECTION_GAP = 28;

export type VerifyEmailScreenProps = {
  onBack: () => void;
  onVerified: (next: NextStep) => void;
};

export function VerifyEmailScreen({ onBack, onVerified }: VerifyEmailScreenProps) {
  const { otpRef, entry, maskedEmail, sheet, failedSheet } = useEmailVerification({ onVerified });

  return (
    <Screen edges={['top']} padded={false}>
      <SignUpStepHeader step={1} onBack={onBack} />

      <View className="px-20" style={{ paddingTop: SECTION_GAP }}>
        <CodeEntryForm
          body={copy.body(entry.length)}
          emphasis={`${maskedEmail ?? copy.fallbackRecipient}.`}
          otpRef={otpRef}
          entry={entry}
          testID="verify"
        />
      </View>

      <StatusSheet
        isPresented={sheet.isPresented}
        tone="success"
        title={copy.verified.title}
        message={copy.verified.message}
        actionLabel={copy.verified.action}
        actionLoading={sheet.continuing}
        onAction={sheet.onContinue}
        onDismiss={sheet.onContinue}
      />

      <StatusSheet
        isPresented={failedSheet.isPresented}
        tone="error"
        title={copy.failed.title}
        message={copy.failed.message}
        actionLabel={copy.failed.action}
        onAction={failedSheet.onTryAgain}
        onDismiss={failedSheet.onTryAgain}
      />
    </Screen>
  );
}
