import { Host } from '@expo/ui';
import type { ReactNode } from 'react';
import { TouchableOpacity, View } from 'react-native';

import { useLiquidGlass } from '@shared/hooks/useLiquidGlass';
import { useTheme } from '@shared/hooks/useTheme';

import { GlassSurface } from '../surface/GlassSurface';
import { NativeIcon } from '../ui/NativeIcon';
import { Text } from '../ui/Text';
import { icons } from '../ui/icons';

/**
 * A screen's top bar with the title centred and a round back button at the left
 * (Figma Saved activities, Notifications, Achievements). The button is a 40pt
 * mint circle — glass where the phone has Liquid Glass. `trailing` holds an
 * optional control at the right; the same width is kept free on both sides so
 * the title stays centred, and a long title wraps rather than collides.
 */

const BUTTON = 40;

export function CenteredHeader({
  title,
  onBack,
  trailing,
}: {
  title: string;
  onBack: () => void;
  trailing?: ReactNode;
}) {
  const theme = useTheme();
  // On glass the circle takes the screen's light or dark, so the chevron follows the text
  // colour; on the solid mint circle it stays teal, as drawn.
  const glass = useLiquidGlass();
  return (
    <View style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: BUTTON }}>
        <TouchableOpacity
          activeOpacity={0.6}
          onPress={onBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <GlassSurface
            fallbackColor={theme.selectedFill}
            interactive
            shadow={false}
            style={{
              width: BUTTON,
              height: BUTTON,
              borderRadius: BUTTON / 2,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Host matchContents pointerEvents="none" ignoreSafeArea="all">
              <NativeIcon
                source={icons.chevronLeft}
                size={15}
                color={glass ? theme.foreground : theme.selectedForeground}
              />
            </Host>
          </GlassSurface>
        </TouchableOpacity>
      </View>
      <Text variant="headingMd" accessibilityRole="header" className="flex-1 text-center">
        {title}
      </Text>
      <View style={{ width: BUTTON, alignItems: 'flex-end' }}>{trailing}</View>
    </View>
  );
}
