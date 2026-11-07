import { isApiError } from '@core/api/ApiError';

import type {
  AttendeesPage,
  CommentsPage,
  Money,
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
  PostPriceDto,
  RsvpStateResponseDto,
} from '../dto/postDetailDtos';

/** Smallest unit to major: 150000 kobo with exponent 2 is ₦1,500 (spec §1.5). */
const toMoney = (cents: number, currency: string, exponent: number): Money => ({
  amount: cents / 10 ** exponent,
  currency,
  exponent,
});

const toPrice = (p: PostPriceDto): Money => toMoney(p.amountCents, p.currency, p.exponent);

export function toPostDetail(dto: PostDetailDto): PostDetail {
  const split = dto.costSplit ?? null;
  return {
    id: dto.id,
    type: dto.type,
    title: dto.title,
    description: dto.description ?? '',
    images: (dto.images ?? []).map((i) => i.fullUrl || i.cardUrl),
    startAt: dto.startAt ?? null,
    endAt: dto.endAt ?? null,
    recurrence: dto.recurrence
      ? { frequency: dto.recurrence.frequency, endsOn: dto.recurrence.endsOn ?? null }
      : null,
    placeName: dto.placeName ?? null,
    cityLabel: dto.city?.label ?? dto.city?.name ?? null,
    lat: dto.lat ?? null,
    lng: dto.lng ?? null,
    capacity: dto.capacity ?? null,
    goingCount: dto.goingCount ?? 0,
    price: dto.price ? toPrice(dto.price) : null,
    costSplit: split
      ? {
          total: toMoney(split.totalCents, split.currency, split.exponent),
          perPerson: toMoney(split.perPersonCents, split.currency, split.exponent),
          expectedCount: split.expectedCount,
        }
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
    saved: dto.saved ?? false,
    interests: (dto.interests ?? []).map((i) => ({ id: i.id, name: i.name, emoji: i.emoji ?? null })),
    // The server sends [] on the other types; filtering on type as well keeps a stray list off the page.
    schedule: dto.type === 'event' ? (dto.schedule ?? []) : [],
    itinerary: dto.type === 'plan' ? (dto.itinerary ?? []) : [],
    linkClickCount: dto.isHost ? (dto.linkClickCount ?? null) : null,
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

export const toComment = (dto: CommentDto): PostComment => {
  // The API sends no author or body on a deleted comment; never show half of one.
  const deleted = dto.deleted || !dto.author;
  return {
    id: dto.id,
    postId: dto.postId,
    parentId: dto.parentId ?? null,
    author:
      deleted || !dto.author
        ? null
        : { userId: dto.author.id, name: dto.author.displayName, avatarUrl: dto.author.avatarUrl ?? null },
    body: deleted ? null : (dto.body ?? ''),
    deleted,
    replyCount: dto.replyCount ?? 0,
    createdAt: dto.createdAt,
    mine: !deleted && (dto.mine ?? false),
    canDelete: !deleted && (dto.canDelete ?? false),
  };
};

export const toCommentsPage = (dto: CommentsPageDto): CommentsPage => ({
  items: (dto.items ?? []).map(toComment),
  total: dto.total ?? 0,
  nextCursor: dto.nextCursor ?? null,
});

/**
 * A report's errors read differently from the rest of the page: its 409 is "you
 * already reported this", its 400 a reason the API refused, and its 403 the
 * moderators pausing this person's reports (spec §5).
 */
export function toReportError(e: unknown): PostDetailError {
  if (isApiError(e)) {
    if (e.code === 'REPORTING_PAUSED') return new PostDetailError('reportingPaused', e.message);
    if (e.code === 'CONFLICT') return new PostDetailError('alreadyReported', e.message);
    if (e.code === 'VALIDATION_FAILED' || e.code === 'BAD_REQUEST')
      return new PostDetailError('reportInvalid', e.message);
  }
  return toPostDetailError(e);
}

/** A comment's 400 is the body the API refused (empty, or over 1000). */
export function toCommentError(e: unknown): PostDetailError {
  if (isApiError(e) && (e.code === 'VALIDATION_FAILED' || e.code === 'BAD_REQUEST')) {
    return new PostDetailError('commentInvalid', e.message);
  }
  return toPostDetailError(e);
}

/** By the API's code (spec §5), never its message. */
export function toPostDetailError(e: unknown): PostDetailError {
  if (e instanceof PostDetailError) return e;
  if (!isApiError(e)) {
    const code = (e as { code?: unknown } | null)?.code;
    return new PostDetailError(code === 'sessionExpired' ? 'sessionExpired' : 'unknown');
  }
  const byCode: Partial<Record<string, PostDetailErrorCode>> = {
    NOT_FOUND: 'notFound',
    REPORTING_PAUSED: 'reportingPaused',
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
