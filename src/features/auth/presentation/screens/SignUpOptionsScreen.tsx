import { View } from 'react-native';

import { Button, Screen, Text, TextLink } from '@shared/components';

import { providerIcons } from '../assets';
import { AuthIntro } from '../components/AuthIntro';

/**
 * Sign up — choose how (Figma "Sign up", light and dark).
 *
 * The heading block sits 40pt under the status bar; the three provider buttons
 * follow 12pt below it, 8pt apart; the sign-in prompt is pinned 80pt above the
 * home indicator.
 *
 * The prompt reads "Already have an account? SIGN IN". The design has "Don't have
 * an account? CREATE ONE", which is the sign-in screen's prompt and makes no sense
 * on the sign-up screen. Flagged to design.
 */

const TOP_OFFSET = 40;
const FOOTER_OFFSET = 80;

export type SignUpOptionsScreenProps = {
  onApple: () => void;
  onGoogle: () => void;
  onEmail: () => void;
  onSignIn: () => void;
};

export function SignUpOptionsScreen({ onApple, onGoogle, onEmail, onSignIn }: SignUpOptionsScreenProps) {
  return (
    <Screen>
      <View style={{ paddingTop: TOP_OFFSET }}>
        <AuthIntro
          title="Sign up"
          body="Create an account to discover new places, connect with travelers, and share your adventures."
        />
        <View className="mt-12 gap-8">
          <Button
            label="Sign up with Apple"
            variant="neutral"
            size="lg"
            fullWidth
            icon={providerIcons.apple}
            onPress={onApple}
            testID="sign-up-apple"
          />
          <Button
            label="Sign up with Google"
            variant="neutral"
            size="lg"
            fullWidth
            icon={providerIcons.google}
            onPress={onGoogle}
            testID="sign-up-google"
          />
          <Button
            label="Sign up with Email Address"
            variant="neutral"
            size="lg"
            fullWidth
            icon={providerIcons.email}
            onPress={onEmail}
            testID="sign-up-email"
          />
        </View>
      </View>

      <View className="flex-1" />

      <View
        className="flex-row items-center justify-center gap-4"
        style={{ marginBottom: FOOTER_OFFSET }}
      >
        <Text variant="bodySm" tone="muted">
          Already have an account?
        </Text>
        <TextLink label="SIGN IN" onPress={onSignIn} testID="sign-up-sign-in" />
      </View>
    </Screen>
  );
}
