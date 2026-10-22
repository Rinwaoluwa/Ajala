import type { AnimationObject } from 'lottie-react-native';

import { CelebrationSheet } from '@shared/components';

import { setupCopy } from '../copy';

/**
 * "You're all set!" — the end of setup: the party popper with
 * a one-off confetti burst from its mouth (`confetti.json`), a welcome by first
 * name, and "Start exploring".
 */

// The bitmap inside the design's `assets/icons/confetti.svg`: that file wraps it in an SVG
// pattern, which the SVG renderer does not draw, so the PNG is shipped as it is.
const POPPER = require('../../../../../assets/images/celebration/party-popper.png') as number;
const CONFETTI = require('../../../../../assets/animations/confetti.json') as AnimationObject;

export type AllSetSheetProps = {
  isPresented: boolean;
  firstName: string | null;
  onStart: () => void;
};

export function AllSetSheet({ isPresented, firstName, onStart }: AllSetSheetProps) {
  return (
    <CelebrationSheet
      isPresented={isPresented}
      illustration={POPPER}
      confetti={CONFETTI}
      title={setupCopy.allSet.title}
      message={setupCopy.allSet.message(firstName)}
      actionLabel={setupCopy.allSet.action}
      onAction={onStart}
    />
  );
}
