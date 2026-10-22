import type { OnboardingSlide } from '../../domain/entities/OnboardingSlide';
import type { OnboardingRepository } from '../../domain/repositories/OnboardingRepository';
import { onboardingStorage } from '../datasources/local/onboardingStorage';

/**
 * Slide copy, transcribed from the Figma onboarding frames (Mobile page, light and
 * dark). The tour is three slides; the welcome page that follows them is not a
 * slide, it is where the tour ends, and the screen draws it.
 *
 * Held in the data layer rather than fetched: this copy ships with the binary, is
 * needed before the first network call, and changing it is a release, not a config
 * change. If marketing ever needs to edit it live, this is the one place to swap
 * for a remote source — nothing above the repository would change.
 */
const SLIDES: OnboardingSlide[] = [
  {
    id: 'passport',
    title: 'Travel your way.',
    body: 'Collect stamps for the places you visit and experiences you complete. Build your AJALA Passport as you explore.',
    imageKey: 'passport',
  },
  {
    id: 'journey',
    title: 'Make every trip a story',
    body: 'Explore new places, discover experiences, and build your journey one adventure at a time.',
    imageKey: 'journey',
  },
  {
    id: 'badges',
    title: 'Explore. Earn. Repeat.',
    body: 'Discover new places, complete travel experiences, and unlock badges along the way.',
    imageKey: 'badges',
  },
];

export const createOnboardingRepository = (): OnboardingRepository => ({
  getSlides: () => SLIDES,
  hasCompleted: () => onboardingStorage.hasCompleted(),
  markCompleted: () => onboardingStorage.markCompleted(),
});
