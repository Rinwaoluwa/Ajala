import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  PasswordField,
  Screen,
  ScreenHeader,
  Text,
  TextField,
  TextLink,
} from '@shared/components';
import { layout } from '@shared/theme';

import type { NextStep } from '../../domain/rules/accountRules';
import { AuthIntro } from '../components/AuthIntro';
import { fieldCopy, signInCopy as copy } from '../copy';
import { useSignIn } from '../hooks/useSignIn';

/**
 * Sign in with email and password (Figma "Sign In", FRD MOB-005).
 *
 * No step indicator — this is a single screen, not a flow. The heading is ink
 * here rather than the brand teal the sign-up screens use; both are in the design
 * file, and the difference is flagged in docs/DESIGN_TOKENS.md.
 *
 * Measured: the heading sits where it does on the stepped screens, so the space
 * the indicator would take is held open by SECTION_GAP below.
 *
 * When the API wants a step-up code, the person moves on to the Verification
 * screen (`onStepUpRequired`), as the screen-to-API map directs.
 */

/** The header row plus the 15pt the step indicator occupies on the stepped screens. */
const SECTION_GAP = 28;
const HEADER_GAP = SECTION_GAP + 15;
const FORGOT_GAP = 12;
const BUTTON_GAP = 28;

export type SignInScreenProps = {
  onBack: () => void;
  onSignedIn: (next: NextStep) => void;
  /** The address exists but was never confirmed; the API just re-sent a code. */
  onNeedsVerification: () => void;
  /** The sign-in looked unusual; the API emailed a code to confirm it. */
  onStepUpRequired: () => void;
  onForgotPassword: () => void;
};

export function SignInScreen({
  onBack,
  onSignedIn,
  onNeedsVerification,
  onStepUpRequired,
  onForgotPassword,
}: SignInScreenProps) {
  const insets = useSafeAreaInsets();
  const { fields, canSubmit, submitting, formError, submit } = useSignIn({
    onSignedIn,
    onNeedsVerification,
    onStepUpRequired,
  });

  return (
    <Screen edges={['top']} padded={false}>
      <View className="px-20">
        <ScreenHeader title={copy.header} onBack={onBack} />
      </View>

      <ScrollView

        // Android draws scrolled content past the edges unless told to clip, over the header above.

        style={{ flex: 1, overflow: 'hidden' }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{
          paddingHorizontal: layout.screenGutter,
          paddingTop: HEADER_GAP,
          paddingBottom: Math.max(insets.bottom, 16) + 16,
        }}
      >
        <AuthIntro tone="default" title={copy.title} body={copy.body} />

        <View style={{ marginTop: SECTION_GAP, gap: layout.input.fieldGap }}>
          <TextField
            label={fieldCopy.email.label}
            placeholder={fieldCopy.email.placeholder}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            // The account name password managers save the password under.
            autoComplete="username"
            returnKeyType="next"
            testID="sign-in-email-field"
            {...fields.email}
          />
          <PasswordField
            label={copy.password.label}
            placeholder={copy.password.placeholder}
            autoComplete="current-password"
            returnKeyType="done"
            testID="sign-in-password-field"
            {...fields.password}
          />
        </View>

        <View style={{ marginTop: FORGOT_GAP, alignItems: 'flex-start' }}>
          <TextLink
            label={copy.forgotPassword}
            tone="foreground"
            emphasis="plain"
            onPress={onForgotPassword}
            testID="sign-in-forgot"
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
            testID="sign-in-submit"
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
    </Screen>
  );
}
