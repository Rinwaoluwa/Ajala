import Ionicons from '@expo/vector-icons/Ionicons';

import { TouchableOpacity, View } from 'react-native';

import { Avatar, BackButton, SkeletonBlock, SkeletonPulse, Text } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

import type { ChatThreadDetail } from '../../domain/entities/Chat';
import { presence } from '../../domain/rules/chatRules';
import { chatCopy } from '../copy';

/**
 * A conversation's top (Figma Chat): back chevron, photo, name, and in teal
 * "Online" or "8 members · 3 online" — or, while someone writes, "typing…"
 * ("Chioma is typing…" in a group). A shield at the right opens the safety
 * tips. The name wraps to two lines at large text rather than clipping.
 *
 * A group has no photo in the API, so it shows its initials.
 */
export function ChatHeader({
  thread,
  name,
  avatarUrl,
  typers,
  onBack,
  onSafety,
  onOpenPerson,
}: {
  thread: ChatThreadDetail | null;
  name: string;
  avatarUrl: string | null;
  /** Names of the others typing now. */
  typers: readonly string[];
  onBack: () => void;
  onSafety: () => void;
  /** In a direct chat, the other person's photo and name open their profile. */
  onOpenPerson?: (userId: string) => void;
}) {
  const theme = useTheme();
  const p = thread ? presence(thread) : null;
  const line =
    typers.length > 0
      ? chatCopy.thread.typing(typers, thread?.kind === 'group')
      : !p
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
      <BackButton onPress={onBack} label={chatCopy.back} />
      {thread ? (
        <TouchableOpacity
          activeOpacity={0.6}
          disabled={!thread.other || !onOpenPerson}
          onPress={() => thread.other && onOpenPerson?.(thread.other.id)}
          accessibilityRole={thread.other && onOpenPerson ? 'button' : undefined}
          accessibilityLabel={thread.other && onOpenPerson ? chatCopy.thread.openProfile(name) : undefined}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}
        >
          <Avatar name={name} uri={avatarUrl} size={48} />
          <View style={{ flex: 1 }}>
            <Text variant="headingMd" numberOfLines={2} accessibilityRole="header">
              {name}
            </Text>
            {line ? (
              <Text variant="bodySm" tone="primary" accessibilityLiveRegion="polite">
                {line}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
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
