import type { OnboardingSlide } from '../entities/OnboardingSlide';

/**
 * Contract the data layer implements. Pure TypeScript — the domain does not know
 * whether completion is stored on device or on a server.
 */
export type OnboardingRepository = {
  getSlides(): OnboardingSlide[];
  hasCompleted(): Promise<boolean>;
  markCompleted(): Promise<void>;
};
