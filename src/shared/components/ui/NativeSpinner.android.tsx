import { CircularProgressIndicator } from '@expo/ui/jetpack-compose';
import { size as sizeModifier } from '@expo/ui/jetpack-compose/modifiers';

import type { NativeSpinnerProps } from './NativeSpinner';

/**
 * Android: Compose's indeterminate `CircularProgressIndicator`, drawn at the
 * given diameter with a stroke thin enough to sit beside a 14pt label. The track
 * is transparent so only the moving arc shows, as on iOS.
 */

const STROKE_WIDTH = 2;

export function NativeSpinner({ size, color }: NativeSpinnerProps) {
  return (
    <CircularProgressIndicator
      color={color}
      trackColor="transparent"
      strokeWidth={STROKE_WIDTH}
      modifiers={[sizeModifier(size, size)]}
    />
  );
}
