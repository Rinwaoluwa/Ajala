import { useEffect, useRef, useState } from 'react';

import { createOnboardingUseCases } from '../../onboardingModule';
import { warmFirstOnboardingImage } from '../onboardingImages';

/**
 * Whether the tour has already been seen, and whether its first frame is ready.
 *
 * `status` starts as `loading` and the caller must not route until it resolves.
 * Redirecting before persisted state has hydrated is what makes cold starts land
 * on the wrong screen.
 *
 * It also warms the first slide's illustration before reporting ready. The splash
 * fades as soon as this resolves, so without the warm the tour's first frame was
 * an empty screen with the art appearing a beat later — the white flash. Only the
 * first is warmed, and only when the tour is actually the destination.
 *
 * The warm is capped: a slow or missing image delays the splash by at most
 * WARM_TIMEOUT_MS and then gives up, because a photo is not worth trapping
 * someone on a splash screen for.
 */
export type OnboardingGate =
  | { status: 'loading' }
  | { status: 'ready'; hasCompleted: boolean };

const WARM_TIMEOUT_MS = 2000;

export function useOnboardingGate(): OnboardingGate {
  const [gate, setGate] = useState<OnboardingGate>({ status: 'loading' });
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Guards against setting state after the screen has gone away.
    let active = true;

    const { hasCompleted, getSlides } = createOnboardingUseCases();

    const warmWithinBudget = (imageKey: string) =>
      Promise.race([
        warmFirstOnboardingImage(imageKey),
        new Promise<void>((resolve) => {
          timeout.current = setTimeout(resolve, WARM_TIMEOUT_MS);
        }),
      ]);

    hasCompleted()
      .then(async (completed) => {
        if (!completed) {
          const first = getSlides()[0];
          if (first) await warmWithinBudget(first.imageKey);
        }
        if (active) setGate({ status: 'ready', hasCompleted: completed });
      })
      .catch(() => {
        // The repository already swallows read failures and returns false; this is
        // the belt-and-braces path. Showing the tour again beats blocking launch.
        if (active) setGate({ status: 'ready', hasCompleted: false });
      });

    return () => {
      active = false;
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, []);

  return gate;
}
