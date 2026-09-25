/**
 * One onboarding slide.
 *
 * `imageKey` is a plain identifier, not a bundled asset: the domain layer must not
 * know that React Native or an image loader exists. Presentation maps the key to a
 * real asset (see presentation/onboardingImages.ts).
 *
 * The key is allowed to resolve to nothing. The photography for these slides has
 * not been exported from Figma yet, so a slide without an asset renders a branded
 * placeholder — the flow works today, and the photos drop in with no code change.
 */
export type OnboardingSlide = {
  id: string;
  title: string;
  body: string;
  imageKey: string;
};
