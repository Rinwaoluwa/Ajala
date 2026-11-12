import { Image } from 'expo-image';

import { SuccessSheet } from '@shared/components';

import { setupCopy } from '../copy';

/**
 * "You're all set!" — the end of setup: a welcome by first name, and "Start
 * exploring".
 *
 * The same celebration as a published post and a saved profile (product,
 * 12 Nov): the shared `SuccessSheet`, with the party popper in its badge. The
 * badge pops with a tilt and a success haptic, rings ripple out, confetti bursts
 * from the badge while a shower fires from the screen's corners, and the words
 * rise in. With Reduce Motion it simply appears, still.
 */

// The bitmap inside the design's `assets/icons/confetti.svg`: that file wraps it in an SVG
// pattern, which the SVG renderer does not draw, so the PNG is shipped as it is.
const POPPER = require('../../../../../assets/images/celebration/party-popper.png') as number;
/** The popper inside the 72pt badge. */
const POPPER_SIZE = 44;

export type AllSetSheetProps = {
  isPresented: boolean;
  firstName: string | null;
  onStart: () => void;
};

export function AllSetSheet({ isPresented, firstName, onStart }: AllSetSheetProps) {
  return (
    <SuccessSheet
      isPresented={isPresented}
      art={<Image source={POPPER} style={{ width: POPPER_SIZE, height: POPPER_SIZE }} contentFit="contain" />}
      title={setupCopy.allSet.title}
      message={setupCopy.allSet.message(firstName)}
      actionLabel={setupCopy.allSet.action}
      onAction={onStart}
      celebrate
      testID="setup-all-set-start"
    />
  );
}
