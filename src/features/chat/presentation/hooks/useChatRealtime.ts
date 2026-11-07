import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuthState, useFreshAccessToken } from '@features/auth';

import { applyChatEvent } from '../state/chatCache';
import { useChatUseCases } from '../state/useChatUseCases';

/**
 * Live chat while this is mounted: holds the one `/chat` socket open and routes
 * its events (new messages, read marks, typing) into the query cache. Several
 * holders share the one connection; the last to unmount closes it. In demo mode
 * the socket is off and this does nothing.
 *
 * The socket asks auth for the token on every (re)connect, and auth refreshes it
 * first when it is about to expire, so a reconnect long after sign-in still
 * carries a live token.
 */
export function useChatRealtime() {
  const { live } = useChatUseCases();
  const auth = useAuthState();
  const queryClient = useQueryClient();
  const freshAccessToken = useFreshAccessToken();
  const signedIn = auth.status === 'signedIn';

  useEffect(() => {
    if (!signedIn) return;
    const unsubscribe = live.subscribe((event) => applyChatEvent(queryClient, event));
    // A refused refresh signs the person out; the socket then simply has no token.
    const release = live.hold(() => freshAccessToken().catch(() => null));
    return () => {
      unsubscribe();
      release();
    };
  }, [live, signedIn, queryClient, freshAccessToken]);
}

/** `useChatRealtime` as a component, for a layout to mount once for the whole signed-in app. */
export function ChatRealtime() {
  useChatRealtime();
  return null;
}
