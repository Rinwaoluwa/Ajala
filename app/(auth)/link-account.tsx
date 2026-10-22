import { router, useLocalSearchParams } from 'expo-router';

import { LinkAccountScreen, nextStepRoutes, type NextStep } from '@features/auth';

/**
 * Linking Google or Apple to the account that already owns the email.
 *
 * The challenge id travels as a param: it is one-use, lasts 10 minutes, and is
 * worthless without the code emailed to the account owner.
 */
export default function LinkAccountRoute() {
  const { challengeId, provider } = useLocalSearchParams<{
    challengeId?: string;
    provider?: string;
  }>();
  return (
    <LinkAccountScreen
      challengeId={challengeId ?? null}
      provider={provider === 'apple' ? 'apple' : 'google'}
      onBack={() => router.back()}
      onSignedIn={(next: NextStep) => router.replace(nextStepRoutes[next])}
    />
  );
}
