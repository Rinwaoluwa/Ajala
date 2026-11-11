import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme } from '@shared/hooks/useTheme';

import { enterRise } from '../motion/enter';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';

/**
 * Nothing here yet (Figma "No plans yet. Where to next?", "No comments yet",
 * "No one's joined yet"): an icon or art, a heading, a line, and optionally one
 * action. It rises in gently (`enterRise`), and takes the space it is given and
 * sits in the middle of it, so an empty screen reads as deliberately empty.
 *
 * `icon` names what the screen holds (a chat bubble for messages, a suitcase
 * for trips), drawn large in the brand colour, so the empty screen says what
 * would be there. `art` takes anything else instead.
 */
export type EmptyStateIcon = ComponentProps<typeof Ionicons>['name'];

export type EmptyStateProps = {
  icon?: EmptyStateIcon;
  art?: ReactNode;
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void; variant?: 'primary' | 'cta' };
};

export function EmptyState({ icon, art, title, body, action }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <Animated.View
      entering={enterRise(40)}
      style={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 32, gap: 8 }}
    >
      {art ? (
        <View style={{ marginBottom: 12 }}>{art}</View>
      ) : icon ? (
        <View style={{ marginBottom: 12 }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <Ionicons name={icon} size={56} color={theme.primary} />
        </View>
      ) : null}
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
