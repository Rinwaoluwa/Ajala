import Ionicons from '@expo/vector-icons/Ionicons';
import { TouchableOpacity, View } from 'react-native';

import { Text, VectorIcon, type VectorIconName } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

import type { AppNotification, NotificationKind } from '../../domain/entities/Notification';
import { shortAgo } from '../../domain/rules/notificationRules';
import { notificationsCopy } from '../copy';

/**
 * One notification (Figma Notifications): a tinted square with its category's
 * icon, the title, a line, and how long ago. Unread rows have a bolder title
 * and a small dot under the time, so "mark all as read" visibly does something.
 *
 * Categories with a supplied design icon use it (`VectorIcon`); the rest keep
 * the Ionicons the screen has always drawn. Chat messages never appear here
 * (they are push only, with their own badge on Messages), so there is no
 * message look.
 */
type Look = { tint: string; ink: string } & (
  { vector: VectorIconName } | { ion: keyof typeof Ionicons.glyphMap }
);

const TEAL = { tint: '#E3F4F1', ink: '#0E6F69' };
const AMBER = { tint: '#FBF0D5', ink: '#B7791F' };
const CORAL = { tint: '#FDE7E7', ink: '#C2334A' };
const SLATE = { tint: '#ECEEF1', ink: '#4A5563' };

const LOOK: Record<NotificationKind, Look> = {
  join_request: { ...AMBER, ion: 'person-add-outline' },
  request_accepted: { ...TEAL, ion: 'checkmark-circle-outline' },
  post_reminder: { ...CORAL, ion: 'calendar-outline' },
  new_comment: { ...AMBER, ion: 'chatbubble-ellipses-outline' },
  subscription: { ...CORAL, vector: 'compass' },
  post_update: { ...TEAL, ion: 'document-text-outline' },
  // "Share my plan": someone you trust, or who trusts you, with your plans.
  trusted_person: { ...TEAL, ion: 'people-outline' },
  moderation: { ...SLATE, ion: 'shield-checkmark-outline' },
};

const ICON_BOX = 52;

export function NotificationRow({ item, onPress }: { item: AppNotification; onPress: () => void }) {
  const theme = useTheme();
  const look = LOOK[item.kind];
  const ago = shortAgo(item.at);
  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.read ? '' : notificationsCopy.unreadPrefix}${item.title}. ${item.body}. ${ago}`}
      style={{
        flexDirection: 'row',
        gap: 14,
        paddingVertical: 14,
        alignItems: 'flex-start',
      }}
    >
      <View
        style={{
          width: ICON_BOX,
          height: ICON_BOX,
          borderRadius: 16,
          backgroundColor: look.tint,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {'vector' in look ? (
          <VectorIcon name={look.vector} size={24} color={look.ink} />
        ) : (
          <Ionicons name={look.ion} size={24} color={look.ink} />
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant={item.read ? 'bodyMd' : 'labelMd'}>{item.title}</Text>
        <Text variant="bodySm" tone="muted">
          {item.body}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 8 }}>
        <Text variant="bodyXs" tone="muted">
          {ago}
        </Text>
        {item.read ? null : (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: theme.primary,
            }}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}
