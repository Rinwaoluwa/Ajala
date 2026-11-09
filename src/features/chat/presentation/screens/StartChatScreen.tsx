import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button, EmptyState, LoadingRing, Screen, ScreenHeader } from '@shared/components';
import { SCREEN_GUTTER } from '@shared/theme';

import { EmptyArt } from '../components/EmptyArt';
import { chatCopy, startProblem } from '../copy';
import { useStartChat } from '../hooks/useStartChat';

/**
 * The step between a Message (or Group chat) button and the conversation: it
 * asks the API for the chat (`POST /conversations`) and hands over to the
 * thread, which replaces it in the stack so Back goes to where the person came
 * from. A direct chat is found or made; a post's group chat is only found,
 * since the API makes it for everyone going when the post goes live.
 *
 * Usually only a moment, shown as a loading ring. When the chat can't be
 * opened it says why in place — their message settings, today's limit on new
 * chats, a chat that isn't there for you — with Try again where trying again
 * could help, and Go back. A full group chat (you're in line for a place) is
 * said calmly, like an empty state, with only Go back.
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
  const problem = vm.error ? startProblem(vm.error, forPost) : null;

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
        ) : problem?.calm ? (
          <Animated.View entering={FadeIn.duration(200)} style={{ gap: 12 }}>
            <EmptyState art={<EmptyArt name="hourglass-outline" />} title={problem.title} body={problem.body} />
            <Button label={chatCopy.start.back} size="lg" fullWidth onPress={onBack} />
          </Animated.View>
        ) : vm.error && problem ? (
          <Animated.View entering={FadeIn.duration(200)} style={{ gap: 12 }}>
            <EmptyState title={problem.title} body={problem.body} />
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
