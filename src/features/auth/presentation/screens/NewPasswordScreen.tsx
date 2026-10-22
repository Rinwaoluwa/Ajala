import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, PasswordField, PasswordRules, Screen, StatusSheet, Text } from '@shared/components';
import { layout } from '@shared/theme';

import { AuthIntro } from '../components/AuthIntro';
import { PasswordResetStepHeader } from '../components/PasswordResetStepHeader';
import { passwordResetCopy } from '../copy';
import { useNewPassword } from '../hooks/useNewPassword';

/**
 * Password reset, step 3 of 3: the new password (Figma "Create a new password"
 * and modal-8 "Password reset successful", FRD MOB-006).
 *
 * Reached from the link the API emails, which carries the one-time token this
 * screen spends. The design drops the title and back arrow here — there is
 * nowhere useful to go back to. The checklist reads the same rules the button
 * does, so they cannot disagree.
 */

const copy = passwordResetCopy.newPassword;

const SECTION_GAP = 28;
const BUTTON_GAP = 20;

export type NewPasswordScreenProps = {
  /** The one-time token from the emailed link. */
  token: string | null;
  onReset: () => void;
};

export function NewPasswordScreen({ token, onReset }: NewPasswordScreenProps) {
  const insets = useSafeAreaInsets();
  const { fields, rules, canSubmit, submitting, formError, submit, sheet } = useNewPassword({
    token,
    onReset,
  });

  return (
    <Screen edges={['top']} padded={false}>
      <PasswordResetStepHeader step={2} titled={false} />

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
        <AuthIntro tone="inkOnLight" title={copy.title} body={token ? copy.body : copy.missingLink} />

        <View style={{ marginTop: SECTION_GAP, gap: layout.input.fieldGap }}>
          <PasswordField
            label={copy.password.label}
            placeholder={copy.password.placeholder}
            autoComplete="new-password"
            returnKeyType="next"
            testID="new-password-field"
            {...fields.password}
          />
          <View>
            <PasswordField
              label={copy.confirmation.label}
              placeholder={copy.confirmation.placeholder}
              autoComplete="new-password"
              returnKeyType="done"
              testID="confirm-password-field"
              {...fields.confirmation}
            />
            <PasswordRules rules={rules} />
          </View>
        </View>

        <View style={{ marginTop: BUTTON_GAP }}>
          <Button
            label={copy.submit}
            size="lg"
            fullWidth
            disabled={!canSubmit}
            loading={submitting}
            onPress={submit}
            testID="reset-password-submit"
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
      </ScrollView>

      <StatusSheet
        isPresented={sheet.isPresented}
        tone="success"
        // Ink, not the success teal: the reset's sheet sets its heading in the
        // text colour in both schemes.
        titleTone="default"
        title={passwordResetCopy.done.title}
        message={passwordResetCopy.done.message}
        actionLabel={passwordResetCopy.done.action}
        onAction={sheet.onContinue}
        onDismiss={sheet.onContinue}
      />
    </Screen>
  );
}
