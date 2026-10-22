import { router } from 'expo-router';

import {
  SignInOptionsScreen,
  accountRoutes,
  nextStepRoutes,
  signInRoutes,
  type IdentityProvider,
  type NextStep,
} from '@features/auth';

export default function SignInOptionsRoute() {
  return (
    <SignInOptionsScreen
      onEmail={() => router.push(signInRoutes.email)}
      onSignUp={() => router.replace(signInRoutes.signUp)}
      onSignedIn={(next: NextStep) => router.replace(nextStepRoutes[next])}
      onLinkRequired={(challengeId: string, provider: IdentityProvider) =>
        router.push({ pathname: accountRoutes.linkAccount, params: { challengeId, provider } })
      }
    />
  );
}
