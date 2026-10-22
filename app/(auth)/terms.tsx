import { Stack, router } from 'expo-router';

import { AcceptTermsScreen, nextStepRoutes, signInRoutes, useSignOut, type NextStep } from '@features/auth';

/** Updated terms after sign-in. No swipe back: the only ways on are accept or sign out. */
export default function TermsRoute() {
  const signOut = useSignOut();
  return (
    <>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <AcceptTermsScreen
        onAccepted={(next: NextStep) => router.replace(nextStepRoutes[next])}
        onSignOut={() => {
          void signOut().then(() => router.replace(signInRoutes.options));
        }}
      />
    </>
  );
}
