import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

/**
 * The laid-out width of a view, for native content that needs a number.
 *
 * Expo UI's `UniversalStyle` has no percentages, so a SwiftUI control that should
 * fill its React Native container has to be given the container's width in points.
 * Spread `onLayout` on the container; `width` is 0 until the first layout pass.
 */
export function useMeasuredWidth() {
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  }, []);
  return { width, onLayout };
}
