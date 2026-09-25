import { View } from 'react-native';

import { Text } from '@shared/components';

import type { OnboardingSlide } from '../../domain/entities/OnboardingSlide';

/**
 * Title and body for the active slide.
 *
 * Sits still while the image pages behind it — the text swaps rather than sliding,
 * which is what the design shows. Feature-local: no other screen pairs a teal
 * heading with body copy in this exact way, so it stays out of `@shared`.
 */
export type OnboardingCopyProps = {
  slide: OnboardingSlide;
};

export function OnboardingCopy({ slide }: OnboardingCopyProps) {
  return (
    <View className="flex-1 px-20 pt-24">
      {/* Re-keying restarts assistive-tech announcement when the slide changes. */}
      <Text key={`${slide.id}-title`} variant="headingXxl" tone="primary">
        {slide.title}
      </Text>
      <Text key={`${slide.id}-body`} variant="bodyMd" className="mt-8">
        {slide.body}
      </Text>
    </View>
  );
}
