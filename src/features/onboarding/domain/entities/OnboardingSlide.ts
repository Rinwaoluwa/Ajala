/**
 * One onboarding slide.
 *
 * `imageKey` is a plain identifier, not a bundled asset: the domain layer must not
 * know that React Native or an image loader exists. Presentation maps the key to a
 * real illustration (see presentation/onboardingImages.ts).
 *
 * The key is allowed to resolve to nothing: the slide then shows its backdrop
 * alone, so the flow still works while art is missing.
 */
export type OnboardingSlide = {
  id: string;
  title: string;
  body: string;
  imageKey: string;
};
