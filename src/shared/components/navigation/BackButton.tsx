/**
 * The app's back button: a round button with a chevron, the same on every screen
 * that has one (settings pages, Saved, Notifications, Achievements…).
 *
 * On iOS 26 with Liquid Glass it is the system's own glass button
 * (`BackButton.ios.tsx`). Everywhere else — Android, older iPhones, Reduce
 * Transparency — it is the design's solid mint circle (`SolidBackButton`).
 */
export {
  SolidBackButton as BackButton,
  BACK_BUTTON_SIZE,
  type BackButtonProps,
} from './SolidBackButton';
