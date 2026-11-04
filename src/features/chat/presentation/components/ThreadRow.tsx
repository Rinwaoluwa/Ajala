import { TouchableOpacity, View } from 'react-native';

import { Avatar, Text } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { palette } from '@shared/theme';

import type { ChatThread } from '../../domain/entities/Chat';
import { previewLine } from '../../domain/rules/chatRules';
import { chatCopy } from '../copy';
import { listTime } from '../format';

/**
 * A conversation in the list (Figma Messages): photo, name, the last message
 * ("Chioma: See you at the meeting point!"), the time at the right and, when
 * there are unread messages, the teal count under it. Unread conversations set
 * their last line in the text colour rather than grey. Grows with text size.
 */
export function ThreadRow({ thread, onPress }: { thread: ChatThread; onPress: () => void }) {
  const theme = useTheme();
  const preview = previewLine(thread, chatCopy.you);
  const unread = thread.unreadCount > 0;
  const time = thread.lastMessage ? listTime(thread.lastMessage.sentAt) : '';
  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[thread.title, preview, time, unread ? chatCopy.unread(thread.unreadCount) : null]
        .filter(Boolean)
        .join(', ')}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 }}
    >
      <Avatar name={thread.title} uri={thread.avatarUrl ?? thread.other?.avatarUrl ?? null} size={56} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text variant="headingSm" numberOfLines={1}>
          {thread.title}
        </Text>
        <Text variant="bodySm" tone={unread ? 'default' : 'muted'} numberOfLines={1}>
          {preview}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 8, alignSelf: 'stretch', justifyContent: 'center' }}>
        <Text variant="bodyXs" tone="muted">
          {time}
        </Text>
        {unread ? (
          <View
            style={{
              minWidth: 26,
              height: 26,
              paddingHorizontal: 7,
              borderRadius: 13,
              backgroundColor: theme.primaryFill,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text variant="labelXs" maxFontSizeMultiplier={1.3} style={{ color: palette.white }}>
              {thread.unreadCount > 99 ? '99+' : thread.unreadCount}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}
