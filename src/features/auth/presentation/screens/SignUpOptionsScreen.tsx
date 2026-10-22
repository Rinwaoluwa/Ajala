import { View } from 'react-native';

import { Screen } from '@shared/components';

import type { IdentityProvider } from '../../domain/entities/Account';
import type { NextStep } from '../../domain/rules/accountRules';
import { AuthFooterPrompt } from '../components/AuthFooterPrompt';
import { AuthIntro } from '../components/AuthIntro';
import { ProviderButtons } from '../components/ProviderButtons';
import { useProviderSignIn } from '../hooks/useProviderSignIn';

/**
 * Sign up — choose how (Figma "Sign up", light and dark).
 *
 * The heading block sits 40pt under the status bar; the three provider buttons
 * follow 12pt below it, 8pt apart; the sign-in prompt is pinned 80pt above the
 * home indicator.
 *
 * Google and Apple go straight to the API (`POST /auth/oauth/google|apple`),
 * which signs up a new address or signs in a known one.
 *
 * The prompt reads "Already have an account? SIGN IN". The design has "Don't have
 * an account? CREATE ONE", which is the sign-in screen's prompt and makes no sense
 * on the sign-up screen. Flagged to design.
 */

const TOP_OFFSET = 40;
const FOOTER_OFFSET = 80;

export type SignUpOptionsScreenProps = {
  onEmail: () => void;
  onSignIn: () => void;
  onSignedIn: (next: NextStep) => void;
  onLinkRequired: (challengeId: string, provider: IdentityProvider) => void;
};

export function SignUpOptionsScreen({
  onEmail,
  onSignIn,
  onSignedIn,
  onLinkRequired,
}: SignUpOptionsScreenProps) {
  const providers = useProviderSignIn({ onSignedIn, onLinkRequired });

  return (
    <Screen scroll>
      <View style={{ paddingTop: TOP_OFFSET }}>
        <AuthIntro
          title="Sign up"
          body="Create an account to discover new places, connect with travelers, and share your adventures."
        />
        <View className="mt-12">
          <ProviderButtons
            verb="Sign up with"
            pending={providers.pending}
            showApple={providers.appleAvailable}
            onApple={providers.signInWithApple}
            onGoogle={providers.signInWithGoogle}
            onEmail={onEmail}
            testID="sign-up"
          />
        </View>
      </View>

      <View className="flex-1" />

      <View style={{ marginBottom: FOOTER_OFFSET }}>
        <AuthFooterPrompt
          sentence="Already have an account?"
          linkLabel="SIGN IN"
          onPress={onSignIn}
          testID="sign-up-sign-in"
        />
      </View>
    </Screen>
  );
}
