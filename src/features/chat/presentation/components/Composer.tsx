import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { splitLinks } from '@core/config/links';
import { haptics } from '@shared/feedback/haptics';
import { ComposeBox, ComposeButton, Host, NativeIcon, SvgIcon, Text, icons } from '@shared/components';
import { useKeyboardShown } from '@shared/hooks/useKeyboardShown';
import { useTheme } from '@shared/hooks/useTheme';
import { palette } from '@shared/theme';

import type { LocalImage } from '../../domain/entities/Chat';
import type { ChatErrorCode } from '../../domain/entities/ChatError';
import { IMAGES_MAX, MESSAGE_MAX } from '../../domain/rules/chatRules';
import { chatCopy, chatErrorMessages } from '../copy';

const NOTICE_MS = 3500;
const THUMB = 64;

/**
 * The box at the foot of a chat (`ComposeBox`): "Message…" on a line that grows
 * with what is typed, and under it a round "+" that adds photos (up to 4,
 * resized and compressed before they leave the phone) and the round send
 * button, teal once there is something to send.
 *
 * It floats: the messages run under it, and nothing is drawn around the box, so
 * touches beside it still reach them.
 *
 * Everything that goes with the message waits inside the box, over the words:
 * chosen photos as small squares, each with a × to take it out; an Ajala link
 * found in the text, to open in the app; and, for a few seconds, why a message
 * could not be sent. The words and photos clear once the message is on its way;
 * if it could not be sent, they stay. Typing tells the others (the hook keeps
 * that to once every 3 seconds).
 */
export function Composer({
  onSend,
  onTyping,
  onPickPhotos,
  sending,
  onOpenLink,
}: {
  /** Resolves with null when sent, or why it was not. */
  onSend: (text: string, images: LocalImage[]) => Promise<ChatErrorCode | null>;
  onTyping: () => void;
  /** Resolves with the photos picked, given how many are already attached. */
  onPickPhotos: (attached: number) => Promise<LocalImage[]>;
  sending: boolean;
  /** An Ajala post or profile link in what is being written: open it in the app. */
  onOpenLink?: (link: { url: string; route: string }) => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardShown = useKeyboardShown();
  const [text, setText] = useState('');
  const [images, setImages] = useState<LocalImage[]>([]);
  // Remounting the uncontrolled field is how it is cleared after a send.
  const [fieldKey, setFieldKey] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const change = useCallback(
    (t: string) => {
      setText(t);
      if (t.trim()) onTyping();
    },
    [onTyping],
  );

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const ready = text.trim().length > 0 || images.length > 0;
  // The first Ajala post or profile link in what is being written, offered to open in the app.
  const ajalaLink = useMemo(() => {
    const found = splitLinks(text).find((part) => part.link?.route);
    return found?.link?.route ? { url: found.link.url, route: found.link.route } : null;
  }, [text]);

  const send = useCallback(() => {
    if (!ready || sending) return;
    haptics.tap();
    void onSend(text, images).then((problem) => {
      if (problem) {
        haptics.error();
        setNotice(chatErrorMessages[problem]);
        return;
      }
      setText('');
      setImages([]);
      setFieldKey((k) => k + 1);
    });
  }, [ready, text, images, sending, onSend]);

  const attach = useCallback(() => {
    void onPickPhotos(images.length).then((picked) => {
      if (picked.length) setImages((now) => [...now, ...picked].slice(0, IMAGES_MAX));
    });
  }, [images.length, onPickPhotos]);

  const full = images.length >= IMAGES_MAX;
  // What goes with the words, inside the box and over them. Nothing at all when there is
  // nothing waiting, so the box is just its line and its buttons.
  const waiting =
    notice || (ajalaLink && onOpenLink) || images.length > 0 ? (
      <View style={{ gap: 8, paddingHorizontal: 4 }}>
        {notice ? (
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)}>
            <Text variant="bodyXs" tone="muted" accessibilityLiveRegion="polite">
              {notice}
            </Text>
          </Animated.View>
        ) : null}
        {ajalaLink && onOpenLink ? (
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onOpenLink(ajalaLink)}
              accessibilityRole="link"
              accessibilityLabel={`${chatCopy.thread.openLink} ${
                ajalaLink.route.startsWith('/post/')
                  ? chatCopy.thread.linkFound.post
                  : chatCopy.thread.linkFound.user
              }`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                alignSelf: 'flex-start',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: theme.skeletonSurface,
              }}
            >
              <Ionicons name="link" size={16} color={theme.primary} />
              <Text variant="labelSm">
                {ajalaLink.route.startsWith('/post/')
                  ? chatCopy.thread.linkFound.post
                  : chatCopy.thread.linkFound.user}
              </Text>
              <Text variant="labelSm" tone="primary">
                {`${chatCopy.thread.openLink} ›`}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        ) : null}
        {images.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {images.map((image, i) => (
              <View key={image.uri}>
                <Image
                  source={{ uri: image.uri }}
                  contentFit="cover"
                  accessibilityLabel={chatCopy.thread.photo(i + 1, images.length)}
                  style={{ width: THUMB, height: THUMB, borderRadius: 12 }}
                />
                <TouchableOpacity
                  activeOpacity={0.6}
                  onPress={() => setImages((now) => now.filter((x) => x.uri !== image.uri))}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={chatCopy.thread.removePhoto(i + 1)}
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: 'rgba(0,0,0,0.55)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="close" size={14} color={palette.white} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>
    ) : null;

  return (
    <View
      // Only the box takes touches: beside it and under it they reach the messages.
      pointerEvents="box-none"
      style={{
        paddingHorizontal: 12,
        paddingTop: 8,
        // On iOS the box rides the keyboard (`KeyboardStickyBar`) and keeps its padding; on
        // Android the app shrinks above the keyboard, so the home-indicator padding goes.
        paddingBottom: Platform.OS === 'android' && keyboardShown ? 12 : Math.max(insets.bottom, 12),
      }}
    >
      <ComposeBox
        key={fieldKey}
        placeholder={chatCopy.thread.placeholder}
        onChangeText={change}
        onSubmit={send}
        maxLength={MESSAGE_MAX}
        above={waiting}
        leading={
          <ComposeButton onPress={attach} disabled={full || sending} accessibilityLabel={chatCopy.thread.attach}>
            <Host matchContents pointerEvents="none" ignoreSafeArea="all">
              <NativeIcon source={icons.add} size={18} color={theme.foreground} />
            </Host>
          </ComposeButton>
        }
        trailing={
          <ComposeButton
            tone="primary"
            active={ready}
            disabled={sending}
            onPress={send}
            accessibilityLabel={chatCopy.thread.send}
          >
            {/* The supplied send mark (`assets/icons/send.svg`). */}
            <SvgIcon name="send" size={17} tint={ready ? palette.white : theme.muted} />
          </ComposeButton>
        }
      />
    </View>
  );
}
