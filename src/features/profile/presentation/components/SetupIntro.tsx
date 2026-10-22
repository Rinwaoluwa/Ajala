import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text, enterRise } from '@shared/components';

/**
 * A setup screen's heading and lead paragraph: Plus Jakarta 32/40, Marigold on
 * light and teal on dark as every setup frame draws it, then Inter 16/24, 8pt apart. They
 * enter together, a beat ahead of the screen's content.
 */
export function SetupIntro({ title, body }: { title: string; body: string }) {
  return (
    <Animated.View entering={enterRise(0)}>
      <Text variant="headingXxl" tone="accent" className="dark:text-heading" accessibilityRole="header">
        {title}
      </Text>
      <View className="mt-8">
        <Text variant="bodyMd">{body}</Text>
      </View>
    </Animated.View>
  );
}
