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
import { fieldCopy, signUpDetailsCopy as copy } from '../copy';
import { SignUpStepHeader } from '../components/SignUpStepHeader';
import { useSignUpDetails } from '../hooks/useSignUpDetails';

/**
 * Create account, step 1 of 3 (Figma "Create account" — empty and filled).
 *
 * Measured: the heading block starts 28pt under the step indicator, the first
 * field 28pt under the paragraph, fields 18pt apart, the rules 4pt under the
 * password box, Continue 20pt under the rules. Continue stays disabled (muted
 * fill, grey label) until every field passes the MOB-001 rules.
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
        <AuthIntro title={copy.title} body={copy.body} />

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
            testID="sign-up-email-field"
            {...fields.email}
          />
          <TextField
            label={fieldCopy.fullName.label}
            placeholder={fieldCopy.fullName.placeholder}
            autoCapitalize="words"
            autoComplete="name"
            returnKeyType="next"
            testID="sign-up-name-field"
            {...fields.fullName}
          />
          <SelectField
            label={fieldCopy.dateOfBirth.label}
            placeholder={fieldCopy.dateOfBirth.placeholder}
            icon={fieldIcons.calendar}
            testID="sign-up-dob-field"
            {...fields.dateOfBirth}
          />
          <View>
            <PasswordField
              label={copy.password.label}
              placeholder={copy.password.placeholder}
              returnKeyType="done"
              testID="sign-up-password-field"
              {...fields.password}
            />
            <PasswordRules rules={passwordRules} />
          </View>
        </View>

        <View className="mt-20">
          <Button
            label={copy.submit}
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

      <DatePickerSheet title={fieldCopy.dateOfBirth.label} {...picker} />
    </Screen>
  );
}
