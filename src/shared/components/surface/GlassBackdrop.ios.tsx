import { Host } from '@expo/ui';
import { Rectangle } from '@expo/ui/swift-ui';
import { clipShape, foregroundStyle, frame, glassEffect } from '@expo/ui/swift-ui/modifiers';
import { StyleSheet, View } from 'react-native';

import type { GlassBackdropProps } from './GlassBackdrop';

/**
 * iOS: the glass as a SwiftUI shape with `.glassEffect`, filling the surface
 * behind its React Native content. SwiftUI draws and redraws it itself, so it
 * appears wherever the surface is — in lists and scroll views, on screens
 * opened later, through fades — which the UIKit glass view did not.
 *
 * It is clipped to its own shape. The frosted glass otherwise casts a soft grey
 * haze well past its edge, and in a row of pills the hazes ran together into a
 * grey band behind the whole row (cut off square where a scroll view ends). The
 * frosted fill and the glass rim are inside the shape, so they stay.
 *
 * It takes no touches: the content above it does.
 */
export function GlassBackdrop({ variant, tint, shape, appearance }: GlassBackdropProps) {
  // The wrapper refuses touches for the whole layer: a SwiftUI host otherwise
  // swallows taps meant for the pill or button drawn over it.
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* ignoreSafeArea: a Host near the top of the screen would otherwise pad its
          SwiftUI content away from the status bar, shrinking the glass. */}
      <Host
        style={StyleSheet.absoluteFill}
        ignoreSafeArea="all"
        colorScheme={appearance === 'auto' ? undefined : appearance}
      >
        <Rectangle
          modifiers={[
            foregroundStyle('#00000000'),
            frame({ maxWidth: Infinity, maxHeight: Infinity }),
            glassEffect({
              glass: { variant, ...(tint ? { tint } : null) },
              ...(shape.capsule
                ? { shape: 'capsule' }
                : { shape: 'roundedRectangle', cornerRadius: shape.radius }),
            }),
            shape.capsule ? clipShape('capsule') : clipShape('roundedRectangle', shape.radius),
          ]}
        />
      </Host>
    </View>
  );
}
