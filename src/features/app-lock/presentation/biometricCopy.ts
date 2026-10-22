import type { BiometricKind } from '@core/biometrics/biometrics';

/**
 * How the biometric is named on screen. The design says "Face ID"; that is
 * right on an iPhone with Face ID and wrong everywhere else, so the words follow
 * the phone: Touch ID, fingerprint, face unlock.
 */
export type BiometricCopy = {
  /** "Face ID" — in a heading or a button. */
  name: string;
  /** "Face ID sign-in" — the screen header. */
  header: string;
  /** The screen's headline: a glance for a face, a touch for a finger. */
  headline: string;
  /** The SF Symbol / Material icon key in `icons`. */
  icon: 'faceId' | 'touchId';
};

const NAMES: Record<BiometricKind, string> = {
  faceId: 'Face ID',
  touchId: 'Touch ID',
  face: 'face unlock',
  fingerprint: 'fingerprint',
  biometric: 'biometric unlock',
};

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function biometricCopy(kind: BiometricKind): BiometricCopy {
  const name = NAMES[kind];
  const isFace = kind === 'faceId' || kind === 'face';
  return {
    name,
    header: `${capitalise(name)} sign-in`,
    headline: isFace ? "A glance, and you're in" : "A touch, and you're in",
    icon: isFace ? 'faceId' : 'touchId',
  };
}
