import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { enterRise } from '../motion/enter';
import { Text } from '../ui/Text';
import { Screen } from './Screen';
import { ScreenHeader } from './ScreenHeader';

/**
 * A screen that exists so navigation has somewhere real to land while the
 * feature behind it is not built: a title, a line saying so, and optionally an
 * action. Replace each use with the real screen.
 */
export function PlaceholderScreen({
  title,
  body = 'Coming soon.',
  onBack,
  children,
}: {
  title: string;
  body?: string;
  onBack?: () => void;
  children?: ReactNode;
}) {
  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      {onBack ? (
        <View className="px-20">
          <ScreenHeader title={title} onBack={onBack} />
        </View>
      ) : null}
      <Animated.View entering={enterRise(0)} className="flex-1 items-center justify-center px-20">
        <Text variant="headingLg" tone="heading" className="text-center" accessibilityRole="header">
          {title}
        </Text>
        <Text variant="bodySm" tone="muted" className="mt-8 text-center">
          {body}
        </Text>
        {children ? <View className="mt-24">{children}</View> : null}
      </Animated.View>
    </Screen>
  );
}
