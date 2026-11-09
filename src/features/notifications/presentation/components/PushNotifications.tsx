import { usePushNotifications } from '../hooks/usePushNotifications';

export type PushNotificationsProps = {
  /** A post push (a reminder, a comment, a changed time or place, ...), as its inbox row opens it. */
  onOpenPost: (postId: string) => void;
  /** A chat push (`chat.message`): its conversation, or Messages when it names none. */
  onOpenMessages: (conversationId: string | null) => void;
  /** A subscription notice: the Travel paywall. */
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
