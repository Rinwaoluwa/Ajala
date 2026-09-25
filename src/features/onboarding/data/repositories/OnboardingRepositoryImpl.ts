import type { OnboardingSlide } from '../../domain/entities/OnboardingSlide';
import type { OnboardingRepository } from '../../domain/repositories/OnboardingRepository';
import { onboardingStorage } from '../datasources/local/onboardingStorage';

/**
 * Slide copy, transcribed from Figma "Onboarding Screen_Variant 2" (node 167-7636).
 *
 * Held in the data layer rather than fetched: this copy ships with the binary, is
 * needed before the first network call, and changing it is a release, not a config
 * change. If marketing ever needs to edit it live, this is the one place to swap
 * for a remote source — nothing above the repository would change.
 */
const SLIDES: OnboardingSlide[] = [
  {
    id: 'discover',
    title: 'Discover New Place',
    body: 'Explore beautiful destinations and uncover places worth adding to your travel list.',
    imageKey: 'discover',
  },
  {
    id: 'connect',
    title: 'Connect With Travelers',
    body: 'Explore beautiful destinations and uncover places worth adding to your travel list.',
    imageKey: 'connect',
  },
  {
    id: 'plan',
    title: 'Discover New Places',
    body: 'Explore beautiful destinations and uncover places worth adding to your travel list.',
    imageKey: 'plan',
  },
  {
    id: 'start',
    title: 'Discover New Places',
    body: 'Explore beautiful destinations and uncover places worth adding to your travel list.',
    imageKey: 'start',
  },
];

export const createOnboardingRepository = (): OnboardingRepository => ({
  getSlides: () => SLIDES,
  hasCompleted: () => onboardingStorage.hasCompleted(),
  markCompleted: () => onboardingStorage.markCompleted(),
});
