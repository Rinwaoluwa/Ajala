/**
 * Android: Expo UI's text button is Compose's `TextButton`, which pads its content
 * by `ButtonDefaults.TextButtonContentPadding` — 12dp each side. The universal
 * Button does not expose `contentPadding`, so components that must line up with the
 * design subtract this instead: the padding still widens the touch target, but the
 * visible content lands where it does on iOS.
 */
export const NATIVE_BUTTON_INSET = 12;
