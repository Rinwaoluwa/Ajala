import { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { EmptyState, LoadingRing, Screen, TextLink } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER } from '@shared/theme';

import type { ConversationItem } from '../../domain/rules/chatRules';
import { ChatHeader } from '../components/ChatHeader';
import { Composer } from '../components/Composer';
import { DayDivider, MessageBubble } from '../components/MessageBubble';
import { PostContextCard } from '../components/PostContextCard';
import { SafetyBanner } from '../components/SafetyBanner';
import { SafetyTipsSheet } from '../components/SafetyTipsSheet';
import { ConversationSkeleton } from '../components/ThreadsSkeleton';
import { chatCopy, chatErrorMessages } from '../copy';
import { dayLabel } from '../format';
import { useConversation } from '../hooks/useConversation';
import { useSafetyBanner } from '../hooks/useSafetyBanner';

/**
 * One conversation (Figma Chat 1:1 and Chat group, light and dark): the header,
 * the "Keep chats on Ajala" banner until it is closed, then the messages oldest
 * first — "Today", the activity card, bubbles — and the composer, which stays
 * above the keyboard.
 *
 * The list opens at the newest message and follows new ones while you are at
 * the bottom; scrolling to the top loads older messages without moving what is
 * on screen.
 */

export type ChatScreenProps = {
  threadId: string;
  onBack: () => void;
  onOpenPost: (postId: string) => void;
};

/** How close to the bottom still counts as "at the newest message". */
const NEAR_BOTTOM = 80;

export function ChatScreen({ threadId, onBack, onOpenPost }: ChatScreenProps) {
  const theme = useTheme();
  const vm = useConversation(threadId);
  const banner = useSafetyBanner();
  const [tipsOpen, setTipsOpen] = useState(false);
  const list = useRef<FlatList<ConversationItem>>(null);
  const atBottom = useRef(true);
  const firstLayout = useRef(true);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    atBottom.current = contentSize.height - (contentOffset.y + layoutMeasurement.height) < NEAR_BOTTOM;
  }, []);

  const followNewest = useCallback(() => {
    if (!atBottom.current) return;
    const first = firstLayout.current;
    list.current?.scrollToEnd({ animated: !first });
    if (first) {
      // On opening, rows are still being measured when the content first reports its size, so
      // the first jump stops short of the newest message; land on it again once they have settled.
      setTimeout(() => list.current?.scrollToEnd({ animated: false }), 250);
    }
    firstLayout.current = false;
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ConversationItem }) => {
      switch (item.kind) {
        case 'day':
          return (
            <DayDivider
              label={dayLabel(item.day, {
                today: chatCopy.thread.today,
                yesterday: chatCopy.thread.yesterday,
              })}
            />
          );
        case 'post':
          return vm.thread?.post ? (
            <PostContextCard post={vm.thread.post} onPress={() => onOpenPost(vm.thread?.post?.id ?? '')} />
          ) : null;
        case 'message':
          return <MessageBubble message={item.message} showSender={item.showSender} />;
      }
    },
    [vm.thread, onOpenPost],
  );

  return (
    <Screen edges={['top']} padded={false}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ChatHeader thread={vm.thread} onBack={onBack} onSafety={() => setTipsOpen(true)} />
        {banner.visible ? (
          <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: 8 }}>
            <SafetyBanner onOpenTips={() => setTipsOpen(true)} onClose={banner.dismiss} />
          </View>
        ) : null}

        {vm.loading ? (
          <View style={{ flex: 1, paddingHorizontal: SCREEN_GUTTER, paddingTop: 12, overflow: 'hidden' }}>
            <ConversationSkeleton />
          </View>
        ) : vm.error && !vm.hasMessages ? (
          <Animated.View
            entering={FadeIn.duration(200)}
            style={{ flex: 1, justifyContent: 'center', paddingHorizontal: SCREEN_GUTTER }}
          >
            <EmptyState
              title={vm.error === 'unavailable' ? chatErrorMessages.unavailable : chatCopy.thread.loadFailed}
              body={vm.error === 'unavailable' ? undefined : chatErrorMessages[vm.error]}
            />
            {vm.error === 'unavailable' ? null : (
              <View style={{ alignItems: 'center' }}>
                <TextLink label={chatCopy.retry} onPress={vm.retry} emphasis="plain" />
              </View>
            )}
          </Animated.View>
        ) : (
          <FlatList
            ref={list}
            data={vm.items}
            keyExtractor={(item) => item.key}
            renderItem={renderItem}
            onScroll={onScroll}
            scrollEventThrottle={32}
            onContentSizeChange={followNewest}
            onStartReached={vm.loadOlder}
            onStartReachedThreshold={0.2}
            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={{
              paddingHorizontal: SCREEN_GUTTER,
              paddingVertical: 12,
              gap: 16,
              flexGrow: 1,
            }}
            ListHeaderComponent={
              vm.loadingOlder ? (
                <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                  <LoadingRing size={24} accessibilityLabel={chatCopy.loading} />
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={{ flex: 1, justifyContent: 'center' }}>
                <EmptyState title={chatCopy.thread.empty.title} body={chatCopy.thread.empty.body} />
              </View>
            }
          />
        )}

        <View style={{ borderTopWidth: 1, borderTopColor: theme.border }}>
          <Composer onSend={vm.submit} sending={vm.sending} />
        </View>
      </KeyboardAvoidingView>

      <SafetyTipsSheet isPresented={tipsOpen} onDismiss={() => setTipsOpen(false)} />
    </Screen>
  );
}
