import type { OnboardingSlide } from '../../domain/entities/OnboardingSlide';

/** One immutable state object for the screen. Updates replace it wholesale. */
export type OnboardingState = {
  slides: OnboardingSlide[];
  /**
   * The page the pager rests on. Pages are the slides and then the welcome page,
   * so `slides.length` is the welcome page.
   */
  index: number;
  /** True while completion is being persisted, so the buttons cannot double-fire. */
  isFinishing: boolean;
  error: string | null;
};

/**
 * How the user left the tour. Both complete onboarding but land in different
 * places. Skipping is not an exit: it jumps to the welcome page, where these two
 * are offered.
 */
export type OnboardingExit = 'signUp' | 'signIn';
