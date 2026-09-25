import { useCallback, useMemo, useRef, useState } from 'react';
import { useSharedValue } from 'react-native-reanimated';

import { createOnboardingUseCases } from '../../onboardingModule';
import type { OnboardingExit, OnboardingState } from '../state/OnboardingState';

/**
 * View model for the onboarding flow.
 *
 * Owns the state, calls one use case per intent, and reports how the user left via
 * `onExit` rather than navigating itself — the screen does not know what comes next.
 *
 * Use cases come from the feature module rather than being built here, so this
 * hook never sees a repository.
 */

export type UseOnboardingOptions = {
  onExit: (intent: OnboardingExit) => void;
};

export function useOnboarding({ onExit }: UseOnboardingOptions) {
  const useCases = useMemo(() => createOnboardingUseCases(), []);

  const [state, setState] = useState<OnboardingState>(() => ({
    slides: useCases.getSlides(),
    index: 0,
    isFinishing: false,
    error: null,
  }));

  /**
   * Live scroll position in slides, written by the carousel on the UI thread and
   * read by the dots. One source, so the indicator cannot drift from the photo.
   */
  const progress = useSharedValue(0);

  // Guards against a second tap landing while the first write is still in flight.
  const finishing = useRef(false);

  const exit = useCallback(
    async (intent: OnboardingExit) => {
      if (finishing.current) return;
      finishing.current = true;
      setState((s) => ({ ...s, isFinishing: true, error: null }));

      try {
        await useCases.complete();
        onExit(intent);
      } catch {
        // Persisting the flag failed. The user still gets through — the cost is
        // seeing the tour again next launch, which beats trapping them here.
        setState((s) => ({
          ...s,
          isFinishing: false,
          error: 'We could not save your progress, but you can continue.',
        }));
        onExit(intent);
      } finally {
        finishing.current = false;
      }
    },
    [onExit, useCases],
  );

  /** Derived, never stored — a stored copy is the kind that drifts. */
  const activeSlide = state.slides[state.index];
  const isLast = state.index === state.slides.length - 1;

  /** Called when the pager settles, so a swipe and a Next tap share one index. */
  const setIndex = useCallback((index: number) => {
    setState((s) => (s.index === index ? s : { ...s, index }));
  }, []);

  /**
   * Advance one slide. Changing the index is enough — the carousel is controlled,
   * so it animates itself to the new page and the dots follow its scroll offset.
   */
  const next = useCallback(() => {
    setState((s) => (s.index < s.slides.length - 1 ? { ...s, index: s.index + 1 } : s));
  }, []);

  const skip = useCallback(() => void exit('skip'), [exit]);
  const signUp = useCallback(() => void exit('signUp'), [exit]);
  const signIn = useCallback(() => void exit('signIn'), [exit]);

  return { state, progress, activeSlide, isLast, next, skip, signUp, signIn, setIndex };
}
