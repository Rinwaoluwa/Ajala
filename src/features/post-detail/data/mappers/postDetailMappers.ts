import { isApiError } from '@core/api/ApiError';

import type {
  AttendeesPage,
  CommentsPage,
  PostComment,
  PostDetail,
  RsvpResult,
} from '../../domain/entities/PostDetail';
import { PostDetailError, type PostDetailErrorCode } from '../../domain/entities/PostDetailError';
import type {
  AttendeesPageDto,
  CommentDto,
  CommentsPageDto,
  PostDetailDto,
  RsvpStateResponseDto,
} from '../dto/postDetailDtos';

export function toPostDetail(dto: PostDetailDto): PostDetail {
  return {
    id: dto.id,
    type: dto.type,
    title: dto.title,
    description: dto.description ?? '',
    images: (dto.images ?? []).map((i) => i.fullUrl || i.cardUrl),
    startAt: dto.startAt ?? null,
    placeName: dto.placeName ?? null,
    cityLabel: dto.city?.label ?? dto.city?.name ?? null,
    lat: dto.lat ?? null,
    lng: dto.lng ?? null,
    capacity: dto.capacity ?? null,
    goingCount: dto.goingCount ?? 0,
    price: dto.price
      ? { amount: dto.price.amountCents / 10 ** dto.price.exponent, currency: dto.price.currency }
      : null,
    externalUrl: dto.externalUrl ?? null,
    joinMode: dto.joinMode === 'external' ? 'external' : 'rsvp',
    rsvpState: dto.rsvpState ?? 'none',
    visibility: dto.visibility === 'private' ? 'private' : 'open',
    waitlistEnabled: dto.waitlistEnabled ?? false,
    waitlistPosition: dto.waitlistPosition ?? null,
    status: dto.status ?? 'published',
    isHost: dto.isHost ?? false,
    host: {
      id: dto.host.id,
      name: dto.host.displayName,
      avatarUrl: dto.host.avatarUrl ?? null,
      verified: dto.host.verified,
    },
  };
}

export function toAttendeesPage(dto: AttendeesPageDto): AttendeesPage {
  return {
    items: (dto.items ?? []).map((a) => ({
      userId: a.user.id,
      name: a.user.displayName,
      avatarUrl: a.user.avatarUrl ?? null,
      state: a.state,
      position: a.position ?? null,
    })),
    nextCursor: dto.nextCursor ?? null,
    counts: {
      going: dto.counts?.going ?? 0,
      requested: dto.counts?.requested ?? null,
      waitlisted: dto.counts?.waitlisted ?? null,
    },
  };
}

export const toRsvpResult = (dto: RsvpStateResponseDto): RsvpResult => ({
  state: dto.state,
  goingCount: dto.goingCount,
  capacity: dto.capacity ?? null,
  waitlistPosition: dto.waitlistPosition ?? null,
});

/** By the API's code (spec §5), never its message. */
export const toComment = (dto: CommentDto): PostComment => ({
  id: dto.id,
  author: { userId: dto.user.id, name: dto.user.displayName, avatarUrl: dto.user.avatarUrl ?? null },
  text: dto.text,
  createdAt: dto.createdAt,
  replyTo: dto.replyTo ? { commentId: dto.replyTo.id, name: dto.replyTo.displayName } : null,
});

export const toCommentsPage = (dto: CommentsPageDto): CommentsPage => ({
  items: (dto.items ?? []).map(toComment),
  total: dto.total ?? dto.items?.length ?? 0,
  nextCursor: dto.nextCursor ?? null,
});

/**
 * Comments are a proposed endpoint: while the API has no such route it answers
 * 404 or 405, which here means "not available yet", not "post not found".
 */
export function toCommentsError(e: unknown): PostDetailError {
  if (isApiError(e) && (e.code === 'NOT_FOUND' || e.code === 'METHOD_NOT_ALLOWED')) {
    return new PostDetailError('commentsUnavailable', e.message);
  }
  return toPostDetailError(e);
}

export function toPostDetailError(e: unknown): PostDetailError {
  if (e instanceof PostDetailError) return e;
  if (!isApiError(e)) {
    const code = (e as { code?: unknown } | null)?.code;
    return new PostDetailError(code === 'sessionExpired' ? 'sessionExpired' : 'unknown');
  }
  const byCode: Partial<Record<string, PostDetailErrorCode>> = {
    NOT_FOUND: 'notFound',
    GONE: 'notFound',
    POST_FULL: 'postFull',
    POST_STARTED: 'postStarted',
    POST_CANCELLED: 'postCancelled',
    EXTERNAL_BOOKING: 'externalBooking',
    POST_HAS_ATTENDEES: 'hasAttendees',
    // Own post, a declined person asking again, or a host-only list.
    CONFLICT: 'notAllowed',
    FORBIDDEN: 'notAllowed',
    RATE_LIMITED: 'rateLimited',
    NETWORK: 'network',
    TIMEOUT: 'network',
    UNAUTHORIZED: 'sessionExpired',
  };
  return new PostDetailError(byCode[e.code] ?? 'unknown', e.message);
}
