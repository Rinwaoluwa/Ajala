import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER } from '@shared/theme';

import { Host } from '../ui/Host';
import { icons } from '../ui/icons';
import { NativeIcon } from '../ui/NativeIcon';
import { Text } from '../ui/Text';

/**
 * A short confirmation that floats over the foot of the screen: a dark pill
 * with a check and one line ("Draft saved"). It does not take touches, so
 * nothing under it is blocked while it shows.
 *
 * The caller decides how long it stays (`visible`); it fades in and out
 * (180ms / 160ms) and is read out by screen readers when it appears.
 */
export type ToastProps = {
  visible: boolean;
  message: string;
  /** Space from the bottom of the screen, above any footer. */
  bottom?: number;
};

export function Toast({ visible, message, bottom = 24 }: ToastProps) {
  const theme = useTheme();
  if (!visible) return null;
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: SCREEN_GUTTER, right: SCREEN_GUTTER, bottom, alignItems: 'center' }}
    >
      <Animated.View
        entering={FadeIn.duration(180)}
        exiting={FadeOut.duration(160)}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          maxWidth: '100%',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 999,
          backgroundColor: theme.foreground,
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
        }}
      >
        <Host matchContents pointerEvents="none" ignoreSafeArea="all">
          <NativeIcon source={icons.checkCircle} size={16} color={theme.background} />
        </Host>
        <Text variant="labelSm" style={{ flexShrink: 1, color: theme.background }}>
          {message}
        </Text>
      </Animated.View>
    </View>
  );
}
