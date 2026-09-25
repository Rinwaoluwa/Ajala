import { View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cn } from '@shared/utils/cn';

/**
 * Screen scaffold.
 *
 * Applies the background and the measured 20px gutter, and resolves safe-area
 * insets. Insets come from `useSafeAreaInsets()` rather than hard-coded offsets,
 * because notch and home-indicator heights differ per device.
 *
 * `edges` controls which sides get inset padding. A screen with a full-bleed image
 * under the status bar passes `edges={['bottom']}` so the image reaches the top.
 */

export type ScreenEdge = 'top' | 'bottom';

export type ScreenProps = ViewProps & {
  edges?: ScreenEdge[];
  /** Apply the standard horizontal gutter. Off for full-bleed layouts. */
  padded?: boolean;
  className?: string;
};

export function Screen({
  edges = ['top', 'bottom'],
  padded = true,
  className,
  style,
  ...props
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className={cn('flex-1 bg-background', padded && 'px-20', className)}
      style={[
        {
          paddingTop: edges.includes('top') ? insets.top : 0,
          // Keep clear of the home indicator without collapsing to zero on devices
          // that report no bottom inset.
          paddingBottom: edges.includes('bottom') ? Math.max(insets.bottom, 16) : 0,
        },
        style,
      ]}
      {...props}
    />
  );
}
