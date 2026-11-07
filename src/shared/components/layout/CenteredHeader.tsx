import type { ReactNode } from 'react';
import { View } from 'react-native';

import { BackButton, BACK_BUTTON_SIZE } from '../navigation/BackButton';
import { Text } from '../ui/Text';

/**
 * A screen's top bar with the title centred and a round back button at the left
 * (Figma Saved activities, Notifications, Achievements). The button is the shared
 * `BackButton`: the system's glass button on iOS 26, a 40pt mint circle elsewhere. `trailing` holds an
 * optional control at the right; the same width is kept free on both sides so
 * the title stays centred, and a long title wraps rather than collides.
 */

const BUTTON = BACK_BUTTON_SIZE;

export function CenteredHeader({
  title,
  onBack,
  trailing,
}: {
  title: string;
  onBack: () => void;
  trailing?: ReactNode;
}) {
  return (
    <View style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: BUTTON }}>
        <BackButton onPress={onBack} />
      </View>
      <Text variant="headingMd" accessibilityRole="header" className="flex-1 text-center">
        {title}
      </Text>
      <View style={{ width: BUTTON, alignItems: 'flex-end' }}>{trailing}</View>
    </View>
  );
}
