import { router } from 'expo-router';

import { SignInScreen, nextStepRoutes, signInRoutes, type NextStep } from '@features/auth';

export default function SignInRoute() {
  return (
    <SignInScreen
      onBack={() => router.back()}
      // The session is already stored by the time this runs.
      onSignedIn={(next: NextStep) => router.replace(nextStepRoutes[next])}
      // The API re-sent a code, so continue in the sign-up verification screen
      // rather than showing an error the person cannot act on.
      // The address travels in memory (the sign-up flow), not the URL; no
      // password goes with it, as the account already exists.
      onNeedsVerification={() => router.replace(signInRoutes.verifyEmail)}
      onStepUpRequired={() => router.push(signInRoutes.stepUp)}
      onForgotPassword={() => router.push(signInRoutes.forgotPassword)}
    />
  );
}
