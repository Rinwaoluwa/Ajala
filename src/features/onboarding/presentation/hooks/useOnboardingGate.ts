import { useEffect, useState } from 'react';

import { createOnboardingRepository } from '../../data/repositories/OnboardingRepositoryImpl';
import { makeHasCompletedOnboarding } from '../../domain/usecases/HasCompletedOnboardingUseCase';

/**
 * Whether the tour has already been seen.
 *
 * `status` starts as `loading` and the caller must not route until it resolves.
 * Redirecting before persisted state has hydrated is what makes cold starts land
 * on the wrong screen.
 */
export type OnboardingGate =
  | { status: 'loading' }
  | { status: 'ready'; hasCompleted: boolean };

export function useOnboardingGate(): OnboardingGate {
  const [gate, setGate] = useState<OnboardingGate>({ status: 'loading' });

  useEffect(() => {
    // Guards against setting state after the screen has gone away.
    let active = true;

    const hasCompleted = makeHasCompletedOnboarding(createOnboardingRepository());

    hasCompleted()
      .then((completed) => {
        if (active) setGate({ status: 'ready', hasCompleted: completed });
      })
      .catch(() => {
        // The repository already swallows read failures and returns false; this is
        // the belt-and-braces path. Showing the tour again beats blocking launch.
        if (active) setGate({ status: 'ready', hasCompleted: false });
      });

    return () => {
      active = false;
    };
  }, []);

  return gate;
}
