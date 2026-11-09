import { router } from 'expo-router';

import { SignInOptionsScreen, nextStepRoutes, signInRoutes, type NextStep } from '@features/auth';

export default function SignInOptionsRoute() {
  return (
    <SignInOptionsScreen
      onEmail={() => router.push(signInRoutes.email)}
      onSignUp={() => router.replace(signInRoutes.signUp)}
      onSignedIn={(next: NextStep) => router.replace(nextStepRoutes[next])}
    />
  );
}
