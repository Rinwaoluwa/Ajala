import type { ImageSourcePropType } from 'react-native';

/**
 * Maps a slide's `imageKey` to a bundled asset.
 *
 * The photography could not be exported from Figma on a view-only seat, so these
 * are intentionally empty. Drop the files into `assets/images/onboarding/` and
 * uncomment the matching line — nothing else in the feature changes.
 *
 *   discover → a beach / palm-tree destination shot
 *   connect  → three travellers seated together, looking out
 *   plan     → a couple outdoors
 *   start    → the final slide's hero image
 */
export const onboardingImages: Record<string, ImageSourcePropType | undefined> = {
  discover: require('../../../../assets/images/onboarding/discover.jpg'),
  connect: require('../../../../assets/images/onboarding/connect.jpg'),
  plan: require('../../../../assets/images/onboarding/plan.jpg'),
  start: require('../../../../assets/images/onboarding/start.jpg'),
};

export const getOnboardingImage = (key: string): ImageSourcePropType | undefined =>
  onboardingImages[key];
