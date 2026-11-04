import { Host } from '@expo/ui';
import { useCallback, useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NativeIcon, Text, TextField, icons } from '@shared/components';
import { useKeyboardShown } from '@shared/hooks/useKeyboardShown';
import { useTheme } from '@shared/hooks/useTheme';
import { palette } from '@shared/theme';

import type { ChatErrorCode } from '../../domain/entities/ChatError';
import { MESSAGE_MAX } from '../../domain/rules/chatRules';
import { chatCopy, chatErrorMessages } from '../copy';

const NOTICE_MS = 3500;

/**
 * The bar at the foot of a chat (Figma Chat): "Message…" in the pale field and
 * a round teal send button. The field clears once the message is on its way; if
 * it could not be sent (or chat is not in the API yet), the text stays and a
 * short line says why for a few seconds.
 */
export function Composer({
  onSend,
  sending,
}: {
  /** Resolves with null when sent, or why it was not. */
  onSend: (text: string) => Promise<ChatErrorCode | null>;
  sending: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardShown = useKeyboardShown();
  const [text, setText] = useState('');
  // Remounting the uncontrolled field is how it is cleared after a send.
  const [fieldKey, setFieldKey] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const change = useCallback((t: string) => setText(t), []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const send = useCallback(() => {
    if (!text.trim() || sending) return;
    void onSend(text).then((problem) => {
      if (problem) {
        setNotice(chatErrorMessages[problem]);
        return;
      }
      setText('');
      setFieldKey((k) => k + 1);
    });
  }, [text, sending, onSend]);

  const ready = text.trim().length > 0;
  return (
    <View
      style={{
        backgroundColor: theme.background,
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: keyboardShown ? 12 : Math.max(insets.bottom, 12),
        gap: 8,
      }}
    >
      {notice ? (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)}>
          <Text variant="bodyXs" tone="muted" accessibilityLiveRegion="polite">
            {notice}
          </Text>
        </Animated.View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <TextField
            key={fieldKey}
            label={chatCopy.thread.placeholder}
            labelHidden
            filled
            placeholder={chatCopy.thread.placeholder}
            onChangeText={change}
            onSubmitEditing={send}
            returnKeyType="send"
            maxLength={MESSAGE_MAX}
          />
        </View>
        <TouchableOpacity
          activeOpacity={0.6}
          onPress={send}
          disabled={sending}
          accessibilityRole="button"
          accessibilityLabel={chatCopy.thread.send}
          accessibilityState={{ disabled: !ready || sending }}
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: theme.primaryFill,
            opacity: ready ? 1 : 0.85,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Host matchContents pointerEvents="none" ignoreSafeArea="all">
            <NativeIcon source={icons.send} size={20} color={palette.white} />
          </Host>
        </TouchableOpacity>
      </View>
    </View>
  );
}
