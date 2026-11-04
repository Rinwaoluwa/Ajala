import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { enterRise } from '../motion/enter';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';

/**
 * Nothing here yet (Figma "No plans yet. Where to next?", "No comments yet",
 * "No one's joined yet"): art, a heading, a line, and optionally one action.
 * It rises in gently (`enterRise`), and centres itself in the space it is given.
 */
export type EmptyStateProps = {
  art?: ReactNode;
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void; variant?: 'primary' | 'cta' };
};

export function EmptyState({ art, title, body, action }: EmptyStateProps) {
  return (
    <Animated.View entering={enterRise(40)} style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
      {art ? <View style={{ marginBottom: 12 }}>{art}</View> : null}
      <Text variant="headingSm" className="text-center" accessibilityRole="header">
        {title}
      </Text>
      {body ? (
        <Text variant="bodySm" tone="muted" className="text-center" style={{ maxWidth: 320 }}>
          {body}
        </Text>
      ) : null}
      {action ? (
        <View style={{ marginTop: 16 }}>
          <Button label={action.label} variant={action.variant ?? 'cta'} onPress={action.onPress} />
        </View>
      ) : null}
    </Animated.View>
  );
}
