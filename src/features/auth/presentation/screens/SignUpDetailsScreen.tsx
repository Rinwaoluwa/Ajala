import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  DatePickerSheet,
  PasswordField,
  PasswordRules,
  Screen,
  SelectField,
  Text,
  TextField,
} from '@shared/components';
import { layout } from '@shared/theme';

import { fieldIcons } from '../assets';
import { AuthIntro } from '../components/AuthIntro';
import { SignUpStepHeader } from '../components/SignUpStepHeader';
import { useSignUpDetails } from '../hooks/useSignUpDetails';

/**
 * Create account, step 1 of 3 (Figma "Create account" — empty and filled).
 *
 * Measured: the heading block starts 28pt under the step indicator, the first
 * field 28pt under the paragraph, fields 18pt apart, the rules 4pt under the
 * password box, Proceed 20pt under the rules. Proceed stays disabled (muted fill,
 * grey label) until every field passes the MOB-001 rules.
 *
 * The header stays put and the form scrolls under it, so a small phone or an open
 * keyboard never hides the fields.
 */

const SECTION_GAP = 28;

export type SignUpDetailsScreenProps = {
  onBack: () => void;
  onCodeSent: () => void;
};

export function SignUpDetailsScreen({ onBack, onCodeSent }: SignUpDetailsScreenProps) {
  const insets = useSafeAreaInsets();
  const { fields, passwordRules, picker, canSubmit, submitting, formError, submit } =
    useSignUpDetails({ onCodeSent });

  return (
    <Screen edges={['top']} padded={false}>
      <SignUpStepHeader step={0} onBack={onBack} />

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
        <AuthIntro
          title="Sign up to meet travellers"
          body="Create your account and start connecting with travellers around the world."
        />

        <View style={{ marginTop: SECTION_GAP, gap: layout.input.fieldGap }}>
          <TextField
            label="Email Address"
            placeholder="Enter your email address"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            returnKeyType="next"
            testID="sign-up-email-field"
            {...fields.email}
          />
          <TextField
            label="Full Name"
            placeholder="Enter your full name"
            autoCapitalize="words"
            autoComplete="name"
            returnKeyType="next"
            testID="sign-up-name-field"
            {...fields.fullName}
          />
          <SelectField
            label="Date of Birth"
            placeholder="Select your date of birth"
            icon={fieldIcons.calendar}
            testID="sign-up-dob-field"
            {...fields.dateOfBirth}
          />
          <View>
            <PasswordField
              label="Password"
              placeholder="Create your password"
              returnKeyType="done"
              testID="sign-up-password-field"
              {...fields.password}
            />
            <PasswordRules rules={passwordRules} />
          </View>
        </View>

        <View className="mt-20">
          <Button
            label="Proceed"
            size="lg"
            fullWidth
            disabled={!canSubmit}
            loading={submitting}
            onPress={submit}
            testID="sign-up-proceed"
          />
          {formError ? (
            <Text variant="bodySm" tone="destructive" className="mt-12" accessibilityLiveRegion="polite">
              {formError}
            </Text>
          ) : null}
        </View>
      </ScrollView>

      <DatePickerSheet title="Date of birth" {...picker} />
    </Screen>
  );
}
