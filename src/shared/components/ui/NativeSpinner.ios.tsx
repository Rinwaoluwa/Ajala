import { ProgressView } from '@expo/ui/swift-ui';
import { controlSize, frame, progressViewStyle, tint } from '@expo/ui/swift-ui/modifiers';

import type { NativeSpinnerProps } from './NativeSpinner';

/**
 * iOS: SwiftUI's circular `ProgressView` — the system spinner.
 *
 * `tint` colours it (iOS 16+); `controlSize(.small)` gives the compact spinner
 * that fits beside a 14pt label, and the frame fixes its footprint so the label
 * does not move when it appears.
 */
export function NativeSpinner({ size, color }: NativeSpinnerProps) {
  return (
    <ProgressView
      modifiers={[
        progressViewStyle('circular'),
        controlSize('small'),
        tint(color as string),
        frame({ width: size, height: size }),
      ]}
    />
  );
}
