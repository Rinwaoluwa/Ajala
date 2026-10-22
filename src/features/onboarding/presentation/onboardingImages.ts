import { Asset } from 'expo-asset';
import { Image } from 'expo-image';

/**
 * Maps a slide's `imageKey` to its illustration and how it sits in the slide.
 *
 * Two kinds, as exported from Figma:
 *   - `fill`   — a full-bleed 393×527 frame (the journey map, the badge burst).
 *     Covers the illustration area.
 *   - `figure` — a cut-out on transparency (the passport). Drawn at its natural
 *     size, centred and resting on the bottom of the area, over a soft backdrop.
 *
 * DARK MODE. `darkSource` is the dark frame's export, shown when the scheme is
 * dark. The dark map is opaque, drawn on Night. The dark badge burst is opaque
 * only where the badges are: its swirl is the pattern at 4% alpha, so it takes
 * its background from the backdrop beneath, which is Night in dark mode. Without
 * a `darkSource` the light art is shown, faded into the background at its foot.
 */

export type OnboardingIllustration = {
  /** Metro module id from `require()`. */
  source: number;
  darkSource?: number;
  layout: 'fill' | 'figure';
  /** Size at the 393pt reference frame, where the area is 527pt tall. */
  width: number;
  height: number;
};

/** The illustration area's height in the 393×852 frame. */
export const REFERENCE_AREA_HEIGHT = 527;

export const onboardingImages: Record<string, OnboardingIllustration> = {
  passport: {
    source: require('../../../../assets/images/onboarding/passport.png') as number,
    layout: 'figure',
    width: 360,
    height: 420,
  },
  journey: {
    source: require('../../../../assets/images/onboarding/map.png') as number,
    darkSource: require('../../../../assets/images/onboarding/map-dark.png') as number,
    layout: 'fill',
    width: 393,
    height: 527,
  },
  badges: {
    source: require('../../../../assets/images/onboarding/badges.png') as number,
    darkSource: require('../../../../assets/images/onboarding/badge-dark.png') as number,
    layout: 'fill',
    width: 391,
    height: 527,
  },
};

export const getOnboardingImage = (key: string): OnboardingIllustration | undefined =>
  onboardingImages[key];

/**
 * Decodes the first slide's illustration into expo-image's cache.
 *
 * Called before the app routes away from the splash, so the tour's first frame is
 * the art rather than an empty backdrop. Only the first is warmed: the rest have
 * a whole swipe's worth of time.
 *
 * Best effort. It resolves on failure and the caller times it out, because a slow
 * or missing image must delay the splash, never hold it forever.
 */
export async function warmFirstOnboardingImage(key: string): Promise<void> {
  const image = onboardingImages[key];
  if (!image) return;
  try {
    // In a dev build the file still has to come off the Metro server, so resolve it
    // first; in a release build it is already on disk and this returns at once.
    const asset = await Asset.fromModule(image.source).downloadAsync();
    const uri = asset.localUri ?? asset.uri;
    if (uri) await Image.prefetch(uri, 'memory-disk');
  } catch {
    // The slide still draws its backdrop, so a failed warm is not worth reporting.
  }
}
