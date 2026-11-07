import { isApiError } from '@core/api/ApiError';

import type {
  AppNotification,
  NotificationKind,
  NotificationsPage,
} from '../../domain/entities/Notification';
import { NotificationsError } from '../../domain/entities/NotificationsError';
import type { InboxPageDto, NotificationDto } from '../dto/notificationsDtos';

const KINDS: readonly NotificationKind[] = [
  'join_request',
  'request_accepted',
  'post_reminder',
  'new_comment',
  'new_message',
  'subscription',
  'post_update',
  'moderation',
];

const text = (v: unknown) => (typeof v === 'string' && v.length > 0 ? v : null);

export function toNotification(dto: NotificationDto): AppNotification {
  const data = dto.data ?? {};
  return {
    id: dto.id,
    // A category added to the API after this build still shows, with the
    // general "post changed" look; tapping it still follows its postId.
    kind: KINDS.includes(dto.category) ? dto.category : 'post_update',
    title: dto.title ?? '',
    body: dto.body ?? '',
    at: dto.createdAt,
    read: dto.readAt !== null && dto.readAt !== undefined,
    postId: text(data.postId),
    conversationId: text(data.conversationId),
  };
}

export const toNotificationsPage = (dto: InboxPageDto): NotificationsPage => ({
  items: (dto.items ?? []).map(toNotification),
  nextCursor: dto.nextCursor ?? null,
  unreadCount: Math.max(0, dto.unreadCount ?? 0),
});

/** By the API's code (spec §5), never its message. */
export function toNotificationsError(e: unknown): NotificationsError {
  if (e instanceof NotificationsError) return e;
  if (isApiError(e)) {
    if (e.code === 'NETWORK' || e.code === 'TIMEOUT') return new NotificationsError('network', e.message);
    if (e.code === 'UNAUTHORIZED') return new NotificationsError('sessionExpired', e.message);
    return new NotificationsError('unknown', e.message);
  }
  return new NotificationsError('unknown');
}
