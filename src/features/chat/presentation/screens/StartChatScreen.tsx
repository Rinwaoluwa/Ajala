import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button, EmptyState, LoadingRing, Screen, ScreenHeader } from '@shared/components';
import { SCREEN_GUTTER } from '@shared/theme';

import { chatCopy, startErrorMessages } from '../copy';
import { useStartChat } from '../hooks/useStartChat';

/**
 * The step between a Message (or Group chat) button and the conversation: it
 * asks the API for the chat (`POST /conversations`, existing or new) and hands
 * over to the thread, which replaces it in the stack so Back goes to where the
 * person came from.
 *
 * Usually only a moment, shown as a loading ring. When the chat can't be
 * opened it says why in place — their message settings, today's limit on new
 * chats, an activity that isn't live — with Try again where trying again could
 * help, and Go back.
 */

export type StartChatScreenProps = {
  userId?: string;
  postId?: string;
  onBack: () => void;
  /** Replace this screen with the conversation. */
  onStarted: (conversationId: string) => void;
};

/** Errors where the same request may well work a moment later. */
const RETRYABLE = new Set(['network', 'rateLimited', 'unknown', 'sessionExpired']);

export function StartChatScreen({ userId, postId, onBack, onStarted }: StartChatScreenProps) {
  const vm = useStartChat({ userId, postId }, onStarted);
  const forPost = !!postId && !userId;

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      <View style={{ paddingHorizontal: SCREEN_GUTTER }}>
        <ScreenHeader title={forPost ? chatCopy.start.groupTitle : chatCopy.start.title} onBack={onBack} />
      </View>
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: SCREEN_GUTTER }}>
        {vm.loading ? (
          <View style={{ alignItems: 'center' }}>
            <LoadingRing size={32} accessibilityLabel={chatCopy.start.opening} />
          </View>
        ) : vm.error ? (
          <Animated.View entering={FadeIn.duration(200)} style={{ gap: 12 }}>
            <EmptyState title={startErrorMessages(vm.error, forPost)} />
            <View style={{ gap: 12 }}>
              {RETRYABLE.has(vm.error) ? (
                <Button label={chatCopy.retry} size="lg" fullWidth onPress={vm.retry} />
              ) : null}
              <Button label={chatCopy.start.back} variant="neutral" size="lg" fullWidth onPress={onBack} />
            </View>
          </Animated.View>
        ) : null}
      </View>
    </Screen>
  );
}
