import { router } from 'expo-router';

import { chatRoutes } from '@features/chat';
import { NotificationsScreen } from '@features/notifications';
import { paymentRoutes } from '@features/payment';
import { postDetailRoutes } from '@features/post-detail';

/** The notifications inbox, opened from the home bell. Each row opens what it is about. */
export default function NotificationsRoute() {
  return (
    <NotificationsScreen
      onBack={() => router.back()}
      onOpenPost={(id) => router.push({ pathname: postDetailRoutes.post, params: { id } })}
      onOpenMessages={(id) =>
        id ? router.push({ pathname: chatRoutes.thread, params: { id } }) : router.push(chatRoutes.list)
      }
      onOpenPaywall={() => router.push(paymentRoutes.travelPaywall)}
    />
  );
}
