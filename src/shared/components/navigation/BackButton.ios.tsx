import { Button, Image } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  buttonBorderShape,
  buttonStyle,
  frame,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { View } from 'react-native';

import { useLiquidGlass } from '@shared/hooks/useLiquidGlass';
import { useTheme } from '@shared/hooks/useTheme';

import { SolidBackButton, BACK_BUTTON_SIZE, type BackButtonProps } from './SolidBackButton';
import { Host } from '../ui/Host';

export { BACK_BUTTON_SIZE, type BackButtonProps } from './SolidBackButton';

/**
 * iOS: with Liquid Glass, the system's own glass button — a SwiftUI `Button`
 * with `.buttonStyle(.glass)` in a circle — so it looks, presses and responds
 * to touch exactly like the back buttons in Apple's apps. Without glass (before
 * iOS 26, Reduce Transparency) it is the design's solid circle.
 *
 * The chevron follows the text colour, so it reads on the light or dark glass.
 */
export function BackButton({ onPress, label = 'Back' }: BackButtonProps) {
  const glass = useLiquidGlass();
  const theme = useTheme();

  if (!glass) return <SolidBackButton onPress={onPress} label={label} />;

  return (
    // A fixed square keeps the row's layout steady while SwiftUI sizes the circle.
    <View style={{ width: BACK_BUTTON_SIZE, height: BACK_BUTTON_SIZE }}>
      {/* ignoreSafeArea: near the top of the screen a Host would push its content down. */}
      <Host matchContents ignoreSafeArea="all" style={{ width: BACK_BUTTON_SIZE, height: BACK_BUTTON_SIZE }}>
        <Button
          onPress={onPress}
          modifiers={[
            buttonStyle('glass'),
            buttonBorderShape('circle'),
            tint(theme.foreground),
            accessibilityLabel(label),
          ]}
        >
          <Image
            systemName="chevron.left"
            size={15}
            color={theme.foreground}
            modifiers={[frame({ width: 22, height: 22 })]}
          />
        </Button>
      </Host>
    </View>
  );
}
