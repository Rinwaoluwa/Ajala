import { View } from 'react-native';

import { Screen } from '@shared/components';

import type { NextStep } from '../../domain/rules/accountRules';
import { AuthFooterPrompt } from '../components/AuthFooterPrompt';
import { AuthIntro } from '../components/AuthIntro';
import { ProviderButtons } from '../components/ProviderButtons';
import { useProviderSignIn } from '../hooks/useProviderSignIn';

/**
 * Sign in — choose how (Figma "Welcome back").
 *
 * The mirror of the sign-up options screen: same layout, same three providers,
 * and the heading keeps the brand teal that both "options" screens use. Google
 * and Apple call the same endpoints as sign-up; the API's `isNew` says which
 * happened, and `GET /me` decides where the person goes.
 */

const TOP_OFFSET = 40;
const FOOTER_OFFSET = 80;

export type SignInOptionsScreenProps = {
  onEmail: () => void;
  onSignUp: () => void;
  onSignedIn: (next: NextStep) => void;
};

export function SignInOptionsScreen({
  onEmail,
  onSignUp,
  onSignedIn,
}: SignInOptionsScreenProps) {
  // An account that uses a password is sent to the email form, as "Continue with email" is.
  const providers = useProviderSignIn({ onSignedIn, onUsePassword: onEmail });

  return (
    <Screen scroll>
      <View style={{ paddingTop: TOP_OFFSET }}>
        <AuthIntro
          title="Welcome back"
          body="Sign in to discover new places, connect with travelers, and share your adventures."
        />
        <View className="mt-12">
          <ProviderButtons
            verb="Continue with"
            pending={providers.pending}
            showApple={providers.appleAvailable}
            onApple={providers.signInWithApple}
            onGoogle={providers.signInWithGoogle}
            onEmail={onEmail}
            testID="sign-in"
          />
        </View>
      </View>

      <View className="flex-1" />

      <View style={{ marginBottom: FOOTER_OFFSET }}>
        <AuthFooterPrompt
          sentence="Don't have an account?"
          linkLabel="CREATE ONE"
          onPress={onSignUp}
          testID="sign-in-create-one"
        />
      </View>
    </Screen>
  );
}
