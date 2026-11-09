import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { useAuthState, useFreshAccessToken, useMyUserId } from '@features/auth';

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
 * carries a live token. When the server refuses a token (or says the session is
 * expiring) the socket hands it back, and auth refreshes past it.
 *
 * Your own id (auth's `useMyUserId`) goes with every event: the socket's
 * messages have no `mine`, and this is how yours land on your side.
 */
export function useChatRealtime() {
  const { live } = useChatUseCases();
  const auth = useAuthState();
  const queryClient = useQueryClient();
  const freshAccessToken = useFreshAccessToken();
  const signedIn = auth.status === 'signedIn';
  // Read at each event, so learning the id later does not reopen the socket.
  const myUserId = useMyUserId();
  const myId = useRef<string | null>(myUserId);
  useEffect(() => {
    myId.current = myUserId;
  }, [myUserId]);

  useEffect(() => {
    if (!signedIn) return;
    const unsubscribe = live.subscribe((event) => applyChatEvent(queryClient, event, myId.current));
    // A refused refresh signs the person out; the socket then simply has no token.
    const release = live.hold((refused) => freshAccessToken(refused).catch(() => null));
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
