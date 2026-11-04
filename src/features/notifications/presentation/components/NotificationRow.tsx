import Ionicons from '@expo/vector-icons/Ionicons';
import { TouchableOpacity, View } from 'react-native';

import { Avatar, Text } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

import type { AppNotification, NotificationKind } from '../../domain/entities/Notification';
import { shortAgo } from '../../domain/rules/notificationRules';

/**
 * One notification (Figma Notifications): a tinted square with its icon (or the
 * sender's photo for a message), the title, a line, and how long ago. Unread
 * titles are bolder.
 */
const LOOK: Record<
  Exclude<NotificationKind, 'message'>,
  { icon: keyof typeof Ionicons.glyphMap; tint: string; ink: string }
> = {
  requestApproved: { icon: 'checkmark-circle-outline', tint: '#E3F4F1', ink: '#0E6F69' },
  reminder: { icon: 'calendar-outline', tint: '#FDE7E7', ink: '#C2334A' },
  joinRequest: { icon: 'person-add-outline', tint: '#FBF0D5', ink: '#B7791F' },
  postUpdated: { icon: 'document-text-outline', tint: '#E3F4F1', ink: '#0E6F69' },
};

export function NotificationRow({ item, onPress }: { item: AppNotification; onPress?: () => void }) {
  const theme = useTheme();
  const look = item.kind === 'message' ? null : LOOK[item.kind];
  return (
    <TouchableOpacity
      activeOpacity={0.6}
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${item.read ? '' : 'Unread. '}${item.title}. ${item.body}. ${shortAgo(item.at)}`}
      style={{ flexDirection: 'row', gap: 14, paddingVertical: 14, alignItems: 'flex-start' }}
    >
      {look ? (
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            backgroundColor: look.tint,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={look.icon} size={24} color={look.ink} />
        </View>
      ) : (
        <Avatar name={item.title} uri={item.avatarUrl} size={52} />
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant={item.read ? 'bodyMd' : 'labelMd'}>{item.title}</Text>
        <Text variant="bodySm" tone="muted">
          {item.body}
        </Text>
      </View>
      <Text variant="bodyXs" tone="muted" style={{ color: theme.muted }}>
        {shortAgo(item.at)}
      </Text>
    </TouchableOpacity>
  );
}
