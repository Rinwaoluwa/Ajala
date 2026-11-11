import { useCallback, useRef, useState } from 'react';
import { FlatList, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { EmptyState, KeyboardStickyBar, LoadingRing, Screen, StatusSheet, TextLink } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER } from '@shared/theme';

import type { ChatMessage } from '../../domain/entities/Chat';
import type { ChatErrorCode } from '../../domain/entities/ChatError';
import type { ConversationItem } from '../../domain/rules/chatRules';
import { ChatHeader } from '../components/ChatHeader';
import { Composer } from '../components/Composer';
import { DayDivider, MessageBubble } from '../components/MessageBubble';
import { PostContextCard } from '../components/PostContextCard';
import { ReportMessageDialog } from '../components/ReportMessageDialog';
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
 * on screen. A long press on someone else's message reports it.
 *
 * When the chat turns out to be gone (a 404: you left or were removed, or the
 * activity was cancelled), the composer goes and a short sheet says so; either
 * of its ways out leaves the screen.
 */

export type ChatScreenProps = {
  threadId: string;
  onBack: () => void;
  onOpenPost: (postId: string) => void;
  /** The other person's profile, from the header of a direct chat. */
  onOpenProfile?: (userId: string) => void;
};

/** How close to the bottom still counts as "at the newest message". */
const NEAR_BOTTOM = 80;

export function ChatScreen({ threadId, onBack, onOpenPost, onOpenProfile }: ChatScreenProps) {
  const theme = useTheme();
  const vm = useConversation(threadId);
  const banner = useSafetyBanner();
  const [tipsOpen, setTipsOpen] = useState(false);
  const [reporting, setReporting] = useState<ChatMessage | null>(null);
  const [reportError, setReportError] = useState<ChatErrorCode | null>(null);
  const [reported, setReported] = useState(false);
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
          return vm.post ? (
            <PostContextCard post={vm.post} onPress={() => onOpenPost(vm.post?.id ?? '')} />
          ) : null;
        case 'message': {
          const m = item.message;
          const reportable = !m.mine && !m.pending && !m.removed;
          return (
            <MessageBubble
              message={m}
              showSender={item.showSender}
              status={vm.statusOf(m)}
              onOpenPost={onOpenPost}
              onReport={
                reportable
                  ? () => {
                      setReportError(null);
                      setReporting(m);
                    }
                  : undefined
              }
            />
          );
        }
      }
    },
    [vm, onOpenPost],
  );

  // The gone sheet's button and its swipe-away can both fire as it closes: leave once.
  const left = useRef(false);
  const leave = useCallback(() => {
    if (left.current) return;
    left.current = true;
    onBack();
  }, [onBack]);

  const submitReport = useCallback(
    (reason: Parameters<typeof vm.report>[1], details: string) => {
      if (!reporting) return;
      void vm.report(reporting.id, reason, details).then((problem) => {
        if (problem) {
          setReportError(problem);
          return;
        }
        setReporting(null);
        setReported(true);
      });
    },
    [reporting, vm],
  );

  return (
    <Screen edges={['top']} padded={false}>
      {/* No KeyboardAvoidingView: the composer rides the keyboard by itself (`KeyboardStickyBar`)
          and the list keeps its size, so nothing on screen jumps when the field is tapped. */}
      <View style={{ flex: 1 }}>
        <ChatHeader
          thread={vm.thread}
          name={vm.name}
          avatarUrl={vm.avatarUrl}
          typers={vm.typers}
          onBack={onBack}
          onSafety={() => setTipsOpen(true)}
          onOpenPerson={onOpenProfile}
        />
        {banner.visible ? (
          <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: 8 }}>
            <SafetyBanner onOpenTips={() => setTipsOpen(true)} onClose={banner.dismiss} />
          </View>
        ) : null}

        {vm.loading ? (
          <View style={{ flex: 1, paddingHorizontal: SCREEN_GUTTER, paddingTop: 12, overflow: 'hidden' }}>
            <ConversationSkeleton />
          </View>
        ) : (vm.gone || vm.error) && !vm.hasMessages ? (
          <Animated.View
            entering={FadeIn.duration(200)}
            style={{ flex: 1, justifyContent: 'center', paddingHorizontal: SCREEN_GUTTER }}
          >
            <EmptyState
              title={vm.gone ? chatCopy.gone.title : chatCopy.thread.loadFailed}
              body={vm.gone || !vm.error ? undefined : chatErrorMessages[vm.error]}
            />
            {vm.gone ? null : (
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
            // iOS: the newest messages stay reachable above the keyboard without resizing the list.
            automaticallyAdjustKeyboardInsets
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

        {vm.gone ? null : (
          <KeyboardStickyBar>
            <View style={{ borderTopWidth: 1, borderTopColor: theme.border }}>
              <Composer
                onSend={vm.submit}
                onTyping={vm.onTyping}
                onPickPhotos={vm.pickPhotos}
                sending={vm.sending}
              />
            </View>
          </KeyboardStickyBar>
        )}
      </View>

      <SafetyTipsSheet isPresented={tipsOpen} onDismiss={() => setTipsOpen(false)} />
      <ReportMessageDialog
        isPresented={!!reporting}
        submitting={vm.reporting}
        error={reportError}
        onSubmit={submitReport}
        onDismiss={() => setReporting(null)}
      />
      <StatusSheet
        isPresented={vm.gone}
        tone="info"
        title={chatCopy.gone.title}
        message={chatCopy.gone.body}
        actionLabel={chatCopy.gone.action}
        onAction={leave}
        onDismiss={leave}
      />
      <StatusSheet
        isPresented={reported}
        title={chatCopy.report.doneTitle}
        message={chatCopy.report.done}
        actionLabel={chatCopy.tips.action}
        onAction={() => setReported(false)}
        onDismiss={() => setReported(false)}
      />
    </Screen>
  );
}
