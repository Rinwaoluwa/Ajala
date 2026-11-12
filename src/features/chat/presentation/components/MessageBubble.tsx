import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { splitLinks } from '@core/config/links';
import { PhotoViewer, Text, enterRise } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { palette } from '@shared/theme';

import type { ChatMessage, ChatPostLock } from '../../domain/entities/Chat';
import { chatCopy } from '../copy';
import { messageTime } from '../format';
import { PostContextCard } from './PostContextCard';

/**
 * A message (Figma Chat): theirs on the left in a pale bubble with the time
 * under it; yours on the right in teal with white text and "09:42 · Sent". In a
 * group, `showSender` puts their name in teal above the first of a run.
 *
 * Bubbles take at most 78% of the width and wrap; a message you just sent rises
 * in and stays dimmed ("Sending…") until the server has it.
 *
 * Also drawn here, beyond the frames:
 * - pictures, above the words, one wide or two to a row. Their links last an
 *   hour, so they are kept in memory only, never on disk;
 * - a tagged activity as the same card the chat opens with, or "This activity
 *   is no longer available";
 * - a message a moderator removed, as "This message was removed" in grey.
 *
 * Someone else's message can be reported with a long press (or the
 * accessibility action), when `onReport` is given.
 */
export function MessageBubble({
  message,
  showSender,
  status,
  onOpenPost,
  onOpenLink,
  onReport,
}: {
  message: ChatMessage;
  showSender: boolean;
  status: 'sent' | 'read';
  /** A locked post (MOB-077) comes with its reason: the paywall, not the post. */
  onOpenPost: (postId: string, lockReason?: ChatPostLock | null) => void;
  /**
   * A link in the message was tapped. `route` is set for an Ajala post or
   * profile link, which opens in the app; anything else opens in the browser.
   */
  onOpenLink?: (link: { url: string; route: string | null }) => void;
  onReport?: () => void;
}) {
  const theme = useTheme();
  const mine = message.mine;
  const meta = message.pending
    ? chatCopy.thread.sending
    : mine
      ? `${messageTime(message.sentAt)} · ${status === 'read' ? chatCopy.thread.read : chatCopy.thread.sent}`
      : messageTime(message.sentAt);
  const text = message.removed ? chatCopy.thread.removed : message.body;
  const images = message.images;
  const spoken = [
    text,
    images.length ? chatCopy.photos(images.length) : null,
    message.taggedPost?.title ?? (message.taggedPostUnavailable ? chatCopy.thread.postUnavailable : null),
  ]
    .filter(Boolean)
    .join('. ');

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
      <Pressable
        onLongPress={onReport}
        disabled={!onReport}
        accessible
        accessibilityLabel={`${mine ? chatCopy.you : message.sender.name}: ${spoken}. ${meta}`}
        accessibilityActions={onReport ? [{ name: 'report', label: chatCopy.thread.report }] : undefined}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'report') onReport?.();
        }}
        // With pictures the column takes the full 78%, so they have a width to share.
        style={{
          ...(images.length > 0 && !message.removed ? { width: '78%' } : { maxWidth: '78%' }),
          gap: 6,
          alignItems: mine ? 'flex-end' : 'flex-start',
        }}
      >
        {images.length > 0 && !message.removed ? (
          <PhotoGrid images={images} placeholder={theme.skeletonSurface} onLongPress={onReport} />
        ) : null}
        {text ? (
          <View
            style={{
              paddingHorizontal: 18,
              paddingVertical: 14,
              borderRadius: 22,
              backgroundColor: mine && !message.removed ? theme.primaryFill : theme.skeletonSurface,
            }}
          >
            <Text
              variant="bodyMd"
              tone={message.removed ? 'muted' : undefined}
              style={[
                message.removed ? { fontStyle: 'italic' } : null,
                !message.removed ? { color: mine ? palette.white : theme.foreground } : null,
              ]}
            >
              {message.removed || !onOpenLink
                ? text
                : // Links show as links: an Ajala post or profile opens in the app.
                  splitLinks(text).map((part, i) =>
                    part.link ? (
                      <Text
                        key={i}
                        variant="bodyMd"
                        onPress={() => onOpenLink(part.link!)}
                        accessibilityRole="link"
                        style={{ color: mine ? palette.white : theme.primary, textDecorationLine: 'underline' }}
                      >
                        {part.text}
                      </Text>
                    ) : (
                      part.text
                    ),
                  )}
            </Text>
          </View>
        ) : null}
      </Pressable>
      {message.removed ? null : message.taggedPost ? (
        <View style={{ maxWidth: '78%' }}>
          <PostContextCard post={message.taggedPost} onPress={() => onOpenPost(message.taggedPost?.id ?? '', message.taggedPost?.lockReason)} />
        </View>
      ) : message.taggedPostUnavailable ? (
        <Text variant="bodySm" tone="muted" style={{ maxWidth: '78%', fontStyle: 'italic' }}>
          {chatCopy.thread.postUnavailable}
        </Text>
      ) : null}
      {/* "10:30 · Sent" on one line: Android wrapped it under short bubbles. */}
      <Text variant="bodyXs" tone="muted" numberOfLines={1} importantForAccessibility="no">
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

const PHOTO_GAP = 4;

/**
 * A message's photos: one wide (4:3), or two to a row as squares, the last on its
 * own row when the count is odd.
 *
 * Sizes are worked out from the row's measured width. Percentage sizes with an
 * aspect ratio came out zero wide inside the bubble, leaving a blank gap where
 * the photos should be.
 */
/**
 * A message's photos: one wide, or two to a row. Tapping one opens it full
 * screen (`PhotoViewer`): swipe between them, pinch to zoom, double-tap, drag.
 * A long press still reports the message, as it does on the bubble.
 */
function PhotoGrid({
  images,
  placeholder,
  onLongPress,
}: {
  images: ChatMessage['images'];
  placeholder: string;
  onLongPress?: () => void;
}) {
  const [width, setWidth] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const half = (width - PHOTO_GAP) / 2;

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: PHOTO_GAP, alignSelf: 'stretch' }}
    >
      {width > 0
        ? images.map((image, i) => {
            const alone = images.length === 1 || (i === images.length - 1 && i % 2 === 0);
            const w = alone ? width : half;
            const h = images.length === 1 ? (width * 3) / 4 : w;
            return (
              <Pressable
                key={`${image.thumbUrl}-${i}`}
                onPress={() => setOpen(i)}
                onLongPress={onLongPress}
                accessibilityRole="imagebutton"
                accessibilityLabel={chatCopy.thread.photo(i + 1, images.length)}
              >
                <Image
                  source={{ uri: image.thumbUrl }}
                  cachePolicy="memory"
                  contentFit="cover"
                  style={{ width: w, height: h, borderRadius: 16, backgroundColor: placeholder }}
                />
              </Pressable>
            );
          })
        : null}
      <PhotoViewer
        images={images.map((image) => image.url || image.thumbUrl)}
        initialIndex={open ?? 0}
        isPresented={open !== null}
        onDismiss={() => setOpen(null)}
      />
    </View>
  );
}
