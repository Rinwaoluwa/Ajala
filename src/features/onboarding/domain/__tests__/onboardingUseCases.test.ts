import { describe, expect, it } from '@jest/globals';

import type { OnboardingSlide } from '../entities/OnboardingSlide';
import type { OnboardingRepository } from '../repositories/OnboardingRepository';
import { makeCompleteOnboarding } from '../usecases/CompleteOnboardingUseCase';
import { makeGetOnboardingSlides } from '../usecases/GetOnboardingSlidesUseCase';
import { makeHasCompletedOnboarding } from '../usecases/HasCompletedOnboardingUseCase';

/**
 * The use cases are pure, so they are tested against an in-memory fake rather than
 * AsyncStorage. If these fail, the bug is in the domain, not the device.
 */

const SLIDES: OnboardingSlide[] = [
  { id: 'a', title: 'First', body: 'One', imageKey: 'a' },
  { id: 'b', title: 'Second', body: 'Two', imageKey: 'b' },
];

function createFakeRepository(initiallyCompleted = false): OnboardingRepository {
  let completed = initiallyCompleted;
  return {
    getSlides: () => SLIDES,
    hasCompleted: async () => completed,
    markCompleted: async () => {
      completed = true;
    },
  };
}

describe('onboarding use cases', () => {
  it('returns the slides in order', () => {
    const getSlides = makeGetOnboardingSlides(createFakeRepository());
    expect(getSlides().map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('reports not completed on a fresh install', async () => {
    const hasCompleted = makeHasCompletedOnboarding(createFakeRepository());
    await expect(hasCompleted()).resolves.toBe(false);
  });

  it('reports completed after completing', async () => {
    const repo = createFakeRepository();
    await makeCompleteOnboarding(repo)();
    await expect(makeHasCompletedOnboarding(repo)()).resolves.toBe(true);
  });

  it('keeps completion idempotent', async () => {
    const repo = createFakeRepository(true);
    await makeCompleteOnboarding(repo)();
    await expect(makeHasCompletedOnboarding(repo)()).resolves.toBe(true);
  });

  it('propagates a storage failure instead of swallowing it', async () => {
    const failing: OnboardingRepository = {
      ...createFakeRepository(),
      markCompleted: () => Promise.reject(new Error('disk full')),
    };
    await expect(makeCompleteOnboarding(failing)()).rejects.toThrow('disk full');
  });
});
