import { router } from 'expo-router';

import { NotificationsScreen } from '@features/notifications';
import { paymentRoutes } from '@features/payment';
import { postDetailRoutes } from '@features/post-detail';

/**
 * The notifications inbox, opened from the home bell. Each row opens what it is
 * about: a post or the Travel paywall. Chat messages are push only, never here.
 */
export default function NotificationsRoute() {
  return (
    <NotificationsScreen
      onBack={() => router.back()}
      onOpenPost={(id) => router.push({ pathname: postDetailRoutes.post, params: { id } })}
      onOpenPaywall={() => router.push(paymentRoutes.travelPaywall)}
    />
  );
}
