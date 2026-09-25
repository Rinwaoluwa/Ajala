import { useMemo } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ImageCarousel, PaginationDots, Text, type CarouselImage } from '@shared/components';

import { OnboardingActions } from '../components/OnboardingActions';
import { OnboardingCopy } from '../components/OnboardingCopy';
import { useOnboarding } from '../hooks/useOnboarding';
import { getOnboardingImage } from '../onboardingImages';
import type { OnboardingExit } from '../state/OnboardingState';

/**
 * Onboarding — Figma "Onboarding Screen_Variant 2" (node 167-7636).
 *
 * Only the photo moves. Tapping Next scrolls the pager, swiping drives the same
 * index, and the dots read the pager's live scroll offset so they track the image
 * rather than catching up afterwards. The copy below swaps in place; the action row
 * is fixed, except on the last slide where it becomes Sign Up / Sign In.
 *
 * LAYOUT CONTRACT — every row states its own height strategy, because a flex:1
 * child inside a parent that hugs its content resolves to zero height and silently
 * disappears:
 *   - photo row:  fixed  (imageHeight)
 *   - copy row:   flex-1 (takes the remainder)
 *   - action row: hugs   (its own content + safe-area padding)
 */

/** The photo occupies this share of the screen height. Measured from the design. */
const IMAGE_HEIGHT_RATIO = 0.62;
/** Dots sit this far in from the photo's lower-left corner (Figma: 16pt). */
const DOTS_INSET = 16;

export type OnboardingScreenProps = {
  /** How the user left. The route maps the intent to a destination. */
  onExit: (intent: OnboardingExit) => void;
};

export function OnboardingScreen({ onExit }: OnboardingScreenProps) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { state, progress, activeSlide, isLast, next, skip, signUp, signIn, setIndex } =
    useOnboarding({ onExit });

  const imageHeight = height * IMAGE_HEIGHT_RATIO;

  const images = useMemo<CarouselImage[]>(
    // Decorative: the heading beside each one already carries the meaning.
    () => state.slides.map((s) => ({ key: s.id, source: getOnboardingImage(s.imageKey) })),
    [state.slides],
  );

  return (
    <View className="flex-1 bg-background">
      {/* Fixed-height photo row; the dots overlay it. */}
      <View style={{ height: imageHeight }}>
        <ImageCarousel
          images={images}
          index={state.index}
          onIndexChange={setIndex}
          progress={progress}
          height={imageHeight}
        />
        <View style={{ position: 'absolute', left: DOTS_INSET, bottom: DOTS_INSET }}>
          <PaginationDots
            count={state.slides.length}
            progress={progress}
            activeIndex={state.index}
            onSurface
          />
        </View>
      </View>

      {/* Takes the remaining height. */}
      <OnboardingCopy slide={activeSlide} />

      {/* Hugs its content. */}
      <View className="px-20 pt-16" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
        <OnboardingActions
          isLast={isLast}
          busy={state.isFinishing}
          onSkip={skip}
          onNext={next}
          onSignUp={signUp}
          onSignIn={signIn}
        />

        {state.error ? (
          <Text variant="bodySm" tone="destructive" className="pt-8">
            {state.error}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
