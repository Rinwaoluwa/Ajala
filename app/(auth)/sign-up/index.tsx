import { router } from 'expo-router';

import { SignUpOptionsScreen, nextStepRoutes, signInRoutes, signUpRoutes, type NextStep } from '@features/auth';

export default function SignUpOptionsRoute() {
  return (
    <SignUpOptionsScreen
      onEmail={() => router.push(signUpRoutes.details)}
      onSignIn={() => router.replace(signUpRoutes.signIn)}
      // Google and Apple have already signed the person in; `GET /me` says where to.
      onSignedIn={(next: NextStep) => router.replace(nextStepRoutes[next])}
      // Their email already has a password account: the email sign-in, with Back to here.
      onSignInWithPassword={() => router.push(signInRoutes.email)}
    />
  );
}
