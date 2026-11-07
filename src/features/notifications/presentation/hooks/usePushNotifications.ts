import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import {
  claimOpenedPush,
  configurePush,
  getPushPermission,
  getPushToken,
  markAskedForPushPermission,
  onPushOpened,
  onPushReceived,
  onPushTokenChange,
  requestPushPermission,
  takeLaunchPush,
  wasAskedForPushPermission,
  type PushMessage,
  type PushToken,
} from '@core/push/pushNotifications';
import { registerBeforeSignOut } from '@core/session/beforeSignOut';

import type { NotificationTarget } from '../../domain/entities/Notification';
import { pushOpenOf, shouldAskForPushPermission } from '../../domain/rules/pushRules';
import { notificationKeys } from '../state/notificationsQueries';
import { useNotificationsUseCases } from '../state/useNotificationsUseCases';
import { useMarkRead } from './useInbox';

/**
 * A short pause before the permission prompt, so it comes once the first
 * screen has settled rather than on top of the launch animation.
 */
const PROMPT_DELAY_MS = 1500;

const SIGN_OUT_TASK = 'notifications.unregisterPush';

/**
 * Push, for as long as the signed-in app is mounted (spec §2.10, API map §11):
 *
 *   - asks for permission once per install, the first time someone reaches
 *     the app signed in with onboarding done; a "no" is respected;
 *   - registers the token (`POST /me/devices`) on each sign-in and whenever it
 *     changes, and again when the app comes back after notifications were
 *     turned on in the phone's settings;
 *   - has sign-out unregister it first (`POST /me/devices/unregister`);
 *   - refreshes the inbox and badge when a push arrives while open;
 *   - opens what a tapped push is about, as its inbox row would, and marks it
 *     read when the push says which inbox item it is.
 *
 * Every failure here is quiet: without push the app still works.
 */
export function usePushNotifications(onOpen: (target: NonNullable<NotificationTarget>) => void) {
  const { registerPushDevice, unregisterPushDevice } = useNotificationsUseCases();
  const queryClient = useQueryClient();
  const markRead = useMarkRead();

  // The token this mount has sent (or is sending), so focus changes don't resend it.
  const sent = useRef<string | null>(null);
  const register = useMutation({
    mutationFn: (token: PushToken) => registerPushDevice(token),
    onError: (_e, token) => {
      // Let the next chance (a token change, coming back to the app) try again.
      if (sent.current === token.token) sent.current = null;
    },
  });

  // The effects below subscribe once; these keep them calling the latest callbacks.
  const latest = useRef({ register: register.mutate, markRead: markRead.mutate, onOpen });
  useEffect(() => {
    latest.current = { register: register.mutate, markRead: markRead.mutate, onOpen };
  });

  // Sign-out runs this before logging out, while the session still works.
  useEffect(
    () => registerBeforeSignOut(SIGN_OUT_TASK, () => unregisterPushDevice()),
    [unregisterPushDevice],
  );

  // Permission, registration, token changes.
  useEffect(() => {
    let active = true;

    const registerIfAllowed = async (known?: PushToken) => {
      if ((await getPushPermission()) !== 'granted') return;
      const token = known ?? (await getPushToken());
      if (!active || !token || token.token === sent.current) return;
      sent.current = token.token;
      latest.current.register(token);
    };

    void (async () => {
      await configurePush();
      const status = await getPushPermission();
      if (shouldAskForPushPermission(status, await wasAskedForPushPermission())) {
        await new Promise((resolve) => setTimeout(resolve, PROMPT_DELAY_MS));
        if (!active) return;
        await markAskedForPushPermission();
        await requestPushPermission();
      }
      if (active) await registerIfAllowed();
    })();

    const offToken = onPushTokenChange((token) => void registerIfAllowed(token));
    // Notifications may have been turned on in the phone's settings meanwhile.
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void registerIfAllowed();
    });
    return () => {
      active = false;
      offToken();
      appState.remove();
    };
  }, []);

  // Arriving and tapped pushes.
  useEffect(() => {
    let active = true;
    const refreshInbox = () => void queryClient.invalidateQueries({ queryKey: notificationKeys.all });

    const open = (message: PushMessage) => {
      if (!claimOpenedPush(message)) return;
      const { target, notificationId } = pushOpenOf(message.data);
      // Marking read refreshes the inbox and badge afterwards too.
      if (notificationId) latest.current.markRead(notificationId);
      else refreshInbox();
      if (target) latest.current.onOpen(target);
    };

    const offReceived = onPushReceived(refreshInbox);
    const offOpened = onPushOpened(open);
    // A tap that launched the app from closed. Deferred a tick so the screens
    // mounted alongside this one are ready to be navigated from.
    void takeLaunchPush().then((message) => {
      if (message) setTimeout(() => active && open(message), 0);
    });
    return () => {
      active = false;
      offReceived();
      offOpened();
    };
  }, [queryClient]);
}
