import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text, enterRise } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { palette } from '@shared/theme';

import type { ChatMessage } from '../../domain/entities/Chat';
import { chatCopy } from '../copy';
import { messageTime } from '../format';

/**
 * A message (Figma Chat): theirs on the left in a pale bubble with the time
 * under it; yours on the right in teal with white text and "09:42 · Sent". In a
 * group, `showSender` puts their name in teal above the first of a run.
 *
 * Bubbles take at most 78% of the width and wrap; a message you just sent rises
 * in and stays dimmed ("Sending…") until the server has it.
 */
export function MessageBubble({ message, showSender }: { message: ChatMessage; showSender: boolean }) {
  const theme = useTheme();
  const mine = message.fromMe;
  const meta = message.pending
    ? chatCopy.thread.sending
    : mine
      ? `${messageTime(message.sentAt)} · ${message.status === 'read' ? chatCopy.thread.read : chatCopy.thread.sent}`
      : messageTime(message.sentAt);

  return (
    <Animated.View
      entering={message.pending ? enterRise(0) : undefined}
      style={{ alignItems: mine ? 'flex-end' : 'flex-start', gap: 6, opacity: message.pending ? 0.7 : 1 }}
    >
      {showSender ? (
        <Text variant="labelSm" tone="primary">
          {message.sender.name}
        </Text>
      ) : null}
      <View
        accessible
        accessibilityLabel={`${mine ? chatCopy.you : message.sender.name}: ${message.text}. ${meta}`}
        style={{
          maxWidth: '78%',
          paddingHorizontal: 18,
          paddingVertical: 14,
          borderRadius: 22,
          backgroundColor: mine ? theme.primaryFill : theme.skeletonSurface,
        }}
      >
        <Text variant="bodyMd" style={{ color: mine ? palette.white : theme.foreground }}>
          {message.text}
        </Text>
      </View>
      <Text variant="bodyXs" tone="muted" importantForAccessibility="no">
        {meta}
      </Text>
    </Animated.View>
  );
}

/** "Today", "Yesterday", "Sat, 17 Oct" between days. */
export function DayDivider({ label }: { label: string }) {
  return (
    <Text variant="bodySm" tone="muted" accessibilityRole="header" style={{ paddingTop: 4 }}>
      {label}
    </Text>
  );
}
