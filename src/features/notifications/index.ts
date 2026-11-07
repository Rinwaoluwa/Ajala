/**
 * Public API of the `notifications` feature: the inbox opened from the home
 * bell (spec §2.17), the unread count for the bell's badge, and push
 * notifications for the signed-in app (spec §2.10).
 */
export {
  NotificationsScreen,
  type NotificationsScreenProps,
} from './presentation/screens/NotificationsScreen';
export { useUnreadNotificationsCount } from './presentation/hooks/useUnreadNotificationsCount';
export {
  PushNotifications,
  type PushNotificationsProps,
} from './presentation/components/PushNotifications';
