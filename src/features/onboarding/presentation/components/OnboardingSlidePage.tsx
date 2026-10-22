import { ScrollView, View } from 'react-native';

import { Text } from '@shared/components';

import type { OnboardingSlide } from '../../domain/entities/OnboardingSlide';
import { getOnboardingImage } from '../onboardingImages';
import { OnboardingIllustration } from './OnboardingIllustration';

/**
 * One page of the tour: the illustration and its centred heading and body. This
 * is what the swipe moves; the action bar stays put over the foot of the screen.
 *
 * Measured from the onboarding frames at 393pt: the heading starts 24pt under the
 * art and the body 4pt under the heading.
 *
 * Below the art the copy scrolls, for when a large text size makes it taller than
 * the room left. `reservedBottom` keeps it clear of the action bar.
 */

export type OnboardingSlidePageProps = {
  slide: OnboardingSlide;
  illustrationHeight: number;
  reservedBottom: number;
  /** Only the settled page is read by assistive technology. */
  active: boolean;
};

export function OnboardingSlidePage({
  slide,
  illustrationHeight,
  reservedBottom,
  active,
}: OnboardingSlidePageProps) {
  return (
    <View
      className="flex-1 bg-background"
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
    >
      <OnboardingIllustration
        illustration={getOnboardingImage(slide.imageKey)}
        height={illustrationHeight}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: reservedBottom }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-20 pt-24">
          <Text variant="headingXxl" tone="heading" className="text-center" accessibilityRole="header">
            {slide.title}
          </Text>
          <Text variant="bodyMd" className="mt-4 text-center">
            {slide.body}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
