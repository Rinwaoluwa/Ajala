import type { OnboardingRepository } from '../repositories/OnboardingRepository';

/**
 * Marks onboarding done. Called for both "Skip" and finishing the last slide —
 * skipping is a completion, not an abandonment, so the user is not shown the tour
 * again on next launch.
 */
export const makeCompleteOnboarding =
  (repo: OnboardingRepository) =>
  (): Promise<void> =>
    repo.markCompleted();

export type CompleteOnboardingUseCase = ReturnType<typeof makeCompleteOnboarding>;
