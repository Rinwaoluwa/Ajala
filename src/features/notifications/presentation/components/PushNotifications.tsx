import { usePushNotifications } from '../hooks/usePushNotifications';

export type PushNotificationsProps = {
  /** The same three places a row in the inbox opens (see `NotificationsScreen`). */
  onOpenPost: (postId: string) => void;
  onOpenMessages: (conversationId: string | null) => void;
  onOpenPaywall: () => void;
};

/**
 * Push notifications for the signed-in app; draws nothing. Mount it once,
 * inside the signed-in layout, so it starts after sign-in and onboarding and
 * stops at sign-out. The route file maps where a tapped push goes, as it does
 * for the inbox.
 */
export function PushNotifications({ onOpenPost, onOpenMessages, onOpenPaywall }: PushNotificationsProps) {
  usePushNotifications((target) => {
    if (target.to === 'post') onOpenPost(target.postId);
    else if (target.to === 'messages') onOpenMessages(target.conversationId);
    else onOpenPaywall();
  });
  return null;
}
