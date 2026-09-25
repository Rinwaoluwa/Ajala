import type { OnboardingSlide } from '../entities/OnboardingSlide';
import type { OnboardingRepository } from '../repositories/OnboardingRepository';

export const makeGetOnboardingSlides =
  (repo: OnboardingRepository) =>
  (): OnboardingSlide[] =>
    repo.getSlides();

export type GetOnboardingSlidesUseCase = ReturnType<typeof makeGetOnboardingSlides>;
