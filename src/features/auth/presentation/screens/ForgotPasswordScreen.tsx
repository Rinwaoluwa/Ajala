import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Screen, Text, TextField } from '@shared/components';
import { layout } from '@shared/theme';

import { AuthFooterPrompt } from '../components/AuthFooterPrompt';
import { AuthIntro } from '../components/AuthIntro';
import { PasswordResetStepHeader } from '../components/PasswordResetStepHeader';
import { fieldCopy, passwordResetCopy } from '../copy';
import { useRequestPasswordReset } from '../hooks/useRequestPasswordReset';

/**
 * Password reset, step 1 of 3: the email address (Figma "Forgot password",
 * FRD MOB-006).
 *
 * Sending succeeds whether or not the address has an account, so the screen never
 * reveals which addresses are registered — see the repository contract.
 *
 * "Send code" asks the API to email a 6-digit code, then moves on to the
 * Verification step. That screen, not this one, says where the code went — and
 * only "if that address has an account".
 *
 * Measured: "Remember your password? Sign in" sits 24pt under the button.
 */

const copy = passwordResetCopy.request;

const SECTION_GAP = 28;
const BUTTON_GAP = 20;
const FOOTER_GAP = 24;

export type ForgotPasswordScreenProps = {
  onBack: () => void;
  /** The code is on its way: go to the Verification step. */
  onCodeSent: () => void;
  onSignIn: () => void;
};

export function ForgotPasswordScreen({ onBack, onCodeSent, onSignIn }: ForgotPasswordScreenProps) {
  const insets = useSafeAreaInsets();
  const { fields, canSubmit, submitting, formError, submit } = useRequestPasswordReset({
    onCodeSent,
  });

  return (
    <Screen edges={['top']} padded={false}>
      <PasswordResetStepHeader step={0} onBack={onBack} />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{
          paddingHorizontal: layout.screenGutter,
          paddingTop: SECTION_GAP,
          paddingBottom: Math.max(insets.bottom, 16) + 16,
        }}
      >
        <AuthIntro tone="inkOnLight" title={copy.title} body={copy.body} />

        <View style={{ marginTop: SECTION_GAP }}>
          <TextField
            label={fieldCopy.email.label}
            placeholder={fieldCopy.email.placeholder}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            returnKeyType="send"
            onSubmitEditing={canSubmit ? submit : undefined}
            testID="forgot-email-field"
            {...fields.email}
          />
        </View>

        <View style={{ marginTop: BUTTON_GAP }}>
          <Button
            label={copy.submit}
            size="lg"
            fullWidth
            disabled={!canSubmit}
            loading={submitting}
            onPress={submit}
            testID="forgot-submit"
          />
          {formError ? (
            <Text
              variant="bodySm"
              tone="destructive"
              className="mt-12"
              accessibilityLiveRegion="polite"
            >
              {formError}
            </Text>
          ) : null}
        </View>

        <View style={{ marginTop: FOOTER_GAP }}>
          <AuthFooterPrompt
            sentence={copy.footerPrompt}
            linkLabel={copy.footerLink}
            tone="foreground"
            emphasis="plain"
            onPress={onSignIn}
            testID="forgot-sign-in"
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
