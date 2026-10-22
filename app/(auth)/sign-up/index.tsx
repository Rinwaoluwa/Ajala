import { router } from 'expo-router';

import {
  SignUpOptionsScreen,
  accountRoutes,
  nextStepRoutes,
  signUpRoutes,
  type IdentityProvider,
  type NextStep,
} from '@features/auth';

export default function SignUpOptionsRoute() {
  return (
    <SignUpOptionsScreen
      onEmail={() => router.push(signUpRoutes.details)}
      onSignIn={() => router.replace(signUpRoutes.signIn)}
      // Google and Apple have already signed the person in; `GET /me` says where to.
      onSignedIn={(next: NextStep) => router.replace(nextStepRoutes[next])}
      onLinkRequired={(challengeId: string, provider: IdentityProvider) =>
        router.push({ pathname: accountRoutes.linkAccount, params: { challengeId, provider } })
      }
    />
  );
}
