import { createOnboardingRepository } from './data/repositories/OnboardingRepositoryImpl';
import { makeCompleteOnboarding } from './domain/usecases/CompleteOnboardingUseCase';
import { makeGetOnboardingSlides } from './domain/usecases/GetOnboardingSlidesUseCase';
import { makeHasCompletedOnboarding } from './domain/usecases/HasCompletedOnboardingUseCase';

/**
 * The feature's composition root: the one place that knows which repository
 * implementation backs the use cases.
 *
 * Presentation imports from here, never from `data/` — so a hook can be tested
 * against a fake by swapping this wiring, and the repository can change without
 * touching a screen. When `src/bootstrap/di` exists, the app container calls this
 * instead of the hooks doing so directly.
 */
export function createOnboardingUseCases() {
  const repo = createOnboardingRepository();
  return {
    getSlides: makeGetOnboardingSlides(repo),
    complete: makeCompleteOnboarding(repo),
    hasCompleted: makeHasCompletedOnboarding(repo),
  };
}

export type OnboardingUseCases = ReturnType<typeof createOnboardingUseCases>;
