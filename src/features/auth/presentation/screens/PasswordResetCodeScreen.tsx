import { useEffect } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '@shared/components';
import { layout } from '@shared/theme';

import { CodeEntryForm } from '../components/CodeEntryForm';
import { PasswordResetStepHeader } from '../components/PasswordResetStepHeader';
import { passwordResetCopy } from '../copy';
import { useVerifyResetCode } from '../hooks/useVerifyResetCode';

/**
 * Password reset, step 2 of 3: the emailed 6-digit code (Figma "Verification"
 * inside the Forgot password flow, FRD MOB-006).
 *
 * The same layout as sign-up's Verification — the stepped "Forgot password"
 * header, then the shared code form — so the two read as one design. A right
 * code moves straight on to the new password; there is no "verified" sheet to
 * dismiss in between. A wrong one is explained under the boxes, and from the
 * fifth the copy points at "Resend code", because the API has burned that code.
 *
 * Scrolls, so the form stays reachable at the largest text sizes with the
 * keyboard up.
 */

const SECTION_GAP = 28;

export type PasswordResetCodeScreenProps = {
  onBack: () => void;
  /** The code bought a reset token, now in the flow: go to the new password. */
  onVerified: () => void;
};

export function PasswordResetCodeScreen({ onBack, onVerified }: PasswordResetCodeScreenProps) {
  const insets = useSafeAreaInsets();
  const { otpRef, entry, maskedEmail, hasEmail } = useVerifyResetCode({ onVerified });

  // Reached with no address (restored after the app was killed): there is no
  // code to answer, so the only way on is back to the email step.
  useEffect(() => {
    if (!hasEmail) onBack();
  }, [hasEmail, onBack]);

  return (
    <Screen edges={['top']} padded={false}>
      <PasswordResetStepHeader step={1} onBack={onBack} />

      <ScrollView

        // Android draws scrolled content past the edges unless told to clip, over the header above.

        style={{ flex: 1, overflow: 'hidden' }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{
          paddingHorizontal: layout.screenGutter,
          paddingTop: SECTION_GAP,
          paddingBottom: Math.max(insets.bottom, 16) + 16,
        }}
      >
        <CodeEntryForm
          body={passwordResetCopy.verify.body(entry.length)}
          emphasis={`${maskedEmail ?? passwordResetCopy.verify.fallbackRecipient}.`}
          otpRef={otpRef}
          entry={entry}
          testID="reset-code"
        />
      </ScrollView>
    </Screen>
  );
}
