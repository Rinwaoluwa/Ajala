import type { OnboardingRepository } from '../repositories/OnboardingRepository';

export const makeHasCompletedOnboarding =
  (repo: OnboardingRepository) =>
  (): Promise<boolean> =>
    repo.hasCompleted();

export type HasCompletedOnboardingUseCase = ReturnType<typeof makeHasCompletedOnboarding>;
