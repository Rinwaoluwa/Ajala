import Ionicons from '@expo/vector-icons/Ionicons';
import { Host } from '@expo/ui';
import { TouchableOpacity, View } from 'react-native';

import { Avatar, NativeIcon, SkeletonBlock, SkeletonPulse, Text, icons } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

import type { ChatThread } from '../../domain/entities/Chat';
import { presence } from '../../domain/rules/chatRules';
import { chatCopy } from '../copy';

/**
 * A conversation's top (Figma Chat): back chevron, photo, name, and in teal
 * "Online" or "8 members · 3 online". A shield at the right opens the safety
 * tips. The name wraps to two lines at large text rather than clipping.
 */
export function ChatHeader({
  thread,
  onBack,
  onSafety,
}: {
  thread: ChatThread | null;
  onBack: () => void;
  onSafety: () => void;
}) {
  const theme = useTheme();
  const p = thread ? presence(thread) : null;
  const line = !p
    ? null
    : 'members' in p
      ? chatCopy.thread.group(p.members, p.online)
      : p.online
        ? chatCopy.thread.online
        : null;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
      }}
    >
      <TouchableOpacity
        activeOpacity={0.6}
        onPress={onBack}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={chatCopy.back}
        style={{ padding: 4 }}
      >
        <Host matchContents pointerEvents="none" ignoreSafeArea="all">
          <NativeIcon source={icons.chevronLeft} size={18} color={theme.foreground} />
        </Host>
      </TouchableOpacity>
      {thread ? (
        <>
          <Avatar name={thread.title} uri={thread.avatarUrl ?? thread.other?.avatarUrl ?? null} size={48} />
          <View style={{ flex: 1 }}>
            <Text variant="headingMd" numberOfLines={2} accessibilityRole="header">
              {thread.title}
            </Text>
            {line ? (
              <Text variant="bodySm" tone="primary">
                {line}
              </Text>
            ) : null}
          </View>
        </>
      ) : (
        // Who it is with, while the conversation loads: the photo and two lines, as placeholders.
        <View style={{ flex: 1 }}>
          <SkeletonPulse label={chatCopy.loading}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <SkeletonBlock width={48} height={48} radius={24} />
              <View style={{ flex: 1, gap: 8 }}>
                <SkeletonBlock width="55%" height={16} radius={8} />
                <SkeletonBlock width="30%" height={12} radius={6} />
              </View>
            </View>
          </SkeletonPulse>
        </View>
      )}
      <TouchableOpacity
        activeOpacity={0.6}
        onPress={onSafety}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={chatCopy.thread.safety}
      >
        <Ionicons name="shield-checkmark-outline" size={22} color={theme.muted} />
      </TouchableOpacity>
    </View>
  );
}
