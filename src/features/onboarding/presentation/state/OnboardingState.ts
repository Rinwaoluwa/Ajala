import type { OnboardingSlide } from '../../domain/entities/OnboardingSlide';

/** One immutable state object for the screen. Updates replace it wholesale. */
export type OnboardingState = {
  slides: OnboardingSlide[];
  index: number;
  /** True while completion is being persisted, so the buttons cannot double-fire. */
  isFinishing: boolean;
  error: string | null;
};

/**
 * How the user left the tour. All three complete onboarding — skipping is a
 * completion, not an abandonment — but they land in different places.
 */
export type OnboardingExit = 'skip' | 'signUp' | 'signIn';
