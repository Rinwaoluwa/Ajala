import { Alert, TouchableOpacity, View } from 'react-native';

import type { MenuButtonProps } from './MenuButton.types';

export type { MenuAction, MenuButtonProps } from './MenuButton.types';

/**
 * A button that offers a few choices (a post's ⋯: report, cancel, delete).
 *
 * Android and web: a tap opens the system dialog with the choices and a Close.
 * iOS opens the native pull-down menu from the button instead
 * (`MenuButton.ios.tsx`).
 */
export function MenuButton({ children, actions, accessibilityLabel, cancelLabel }: MenuButtonProps) {
  const open = () =>
    Alert.alert(accessibilityLabel, undefined, [
      ...actions.map((a) => ({
        text: a.label,
        style: a.destructive ? ('destructive' as const) : ('default' as const),
        onPress: a.onPress,
      })),
      { text: cancelLabel, style: 'cancel' as const },
    ]);
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={open}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {/* The face only draws: a button inside it must not take the tap. */}
      <View pointerEvents="none">{children}</View>
    </TouchableOpacity>
  );
}
