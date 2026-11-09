import { isApiError } from '@core/api/ApiError';

import { CreatePostError, type CreatePostErrorCode } from '../../domain/entities/CreatePostError';
import type { Interest, PostSubmission, SavedPost } from '../../domain/entities/PostDraft';
import { canRepeat, hasPrice } from '../../domain/rules/postDraftRules';
import type {
  CreatePostFieldsDto,
  InterestDto,
  SavedPostDto,
  UpdatePostDto,
  UploadFile,
} from '../dto/postDtos';

export function toCreateFields(s: PostSubmission, status: 'draft' | 'published'): CreatePostFieldsDto {
  return {
    type: s.type,
    title: s.title,
    description: s.description,
    startAt: s.startAt,
    endAt: s.endAt,
    placeId: s.placeId,
    lat: s.lat,
    lng: s.lng,
    placeName: s.placeName,
    capacity: s.capacity,
    priceCents: s.priceCents,
    currency: s.currency,
    externalUrl: s.externalUrl,
    waitlistEnabled: s.waitlistEnabled,
    visibility: s.visibility,
    showOnMap: s.showOnMap,
    interestIds: s.interestIds.length ? s.interestIds : undefined,
    schedule: s.schedule,
    itinerary: s.itinerary,
    recurrence: s.recurrence?.frequency,
    recurrenceEndsOn: s.recurrence?.endsOn,
    status,
  };
}

/**
 * Where the post goes on an edit (spec §2.12): a place id or a pin, never both,
 * and never null. With neither, nothing is sent and the post keeps its place:
 * the API has no way to clear one (`lat`/`lng` are not nullable).
 */
function placeBody(s: PostSubmission): Pick<UpdatePostDto, 'placeId' | 'lat' | 'lng'> {
  if (s.placeId) return { placeId: s.placeId };
  if (s.lat !== undefined && s.lng !== undefined) return { lat: s.lat, lng: s.lng };
  return {};
}

/**
 * The PATCH body. A field left blank since the last save is cleared with null
 * (spec §6: "send null to clear"), except the place, which can only be moved.
 *
 * Fields only some types take are sent, even as null, only on those types: the
 * API answers a type-only field on the wrong type with a 400. So a Plan never
 * carries a price, currency or link.
 */
export function toUpdateBody(s: PostSubmission): UpdatePostDto {
  return {
    title: s.title,
    ...(s.description !== undefined ? { description: s.description } : null),
    ...(s.startAt !== undefined ? { startAt: s.startAt } : null),
    endAt: s.endAt ?? null,
    ...placeBody(s),
    placeName: s.placeName ?? null,
    capacity: s.capacity ?? null,
    // Skipping the price step clears both, so an earlier save's price or link goes too.
    ...(hasPrice(s.type)
      ? {
          priceCents: s.priceCents ?? null,
          currency: s.currency ?? null,
          externalUrl: s.externalUrl ?? null,
        }
      : null),
    waitlistEnabled: s.waitlistEnabled,
    visibility: s.visibility,
    showOnMap: s.showOnMap,
    // The API wants 1–3 interests whenever the field is sent, even on a draft, so a
    // draft saved before any are picked leaves it out (an empty list is a 400).
    ...(s.interestIds.length ? { interestIds: s.interestIds } : null),
    ...(s.type === 'event' ? { schedule: s.schedule ?? null } : null),
    ...(s.type === 'plan' ? { itinerary: s.itinerary ?? null } : null),
    ...(canRepeat(s.type)
      ? { recurrence: s.recurrence?.frequency ?? null, recurrenceEndsOn: s.recurrence?.endsOn ?? null }
      : null),
  };
}

export const toUploadFiles = (s: PostSubmission): UploadFile[] =>
  s.photos.map((p) => ({ uri: p.uri, name: p.name, type: p.type }));

export const toInterest = (dto: InterestDto): Interest => ({
  id: dto.id,
  name: dto.name,
  emoji: dto.emoji ?? null,
});

/**
 * By the API's code (spec §5, API map §5), never its message. `creatingDraft`
 * says whether this was a `POST /posts` that would add a draft: the only call a
 * plain 409 CONFLICT means "20 drafts already" for. Elsewhere (an edit or a
 * publish) it means the post was cancelled, taken down or is already live.
 */
export function toCreatePostError(e: unknown, creatingDraft = false): CreatePostError {
  if (e instanceof CreatePostError) return e;
  if (!isApiError(e)) {
    // Auth's session wrapper ends a dead session with its own error type.
    const code = (e as { code?: unknown } | null)?.code;
    return new CreatePostError(code === 'sessionExpired' ? 'sessionExpired' : 'unknown');
  }
  const byCode: Partial<Record<string, CreatePostErrorCode>> = {
    VALIDATION_FAILED: 'invalid',
    BAD_REQUEST: 'invalid',
    EVENT_MONTHLY_CAP: 'eventMonthlyCap',
    CONFLICT: creatingDraft ? 'draftLimit' : 'conflict',
    PAYLOAD_TOO_LARGE: 'imageTooLarge',
    UNSUPPORTED_MEDIA_TYPE: 'imageNotSupported',
    FORBIDDEN: 'suspended',
    RATE_LIMITED: 'rateLimited',
    // Uploads busy, or the server's map lookup is down: worth another go shortly.
    SERVICE_UNAVAILABLE: 'busy',
    NETWORK: 'network',
    TIMEOUT: 'network',
    UNAUTHORIZED: 'sessionExpired',
  };
  const resetsAt = typeof e.details?.resetsAt === 'string' ? e.details.resetsAt : null;
  return new CreatePostError(byCode[e.code] ?? 'unknown', {
    message: e.message,
    fieldErrors: e.fieldErrors,
    resetsAt,
  });
}

export function toSavedPost(dto: SavedPostDto): SavedPost {
  const priceCents = dto.price ? hundredths(dto.price.amountCents, dto.price.exponent) : null;
  return {
    id: dto.id,
    type: dto.type,
    title: dto.title ?? '',
    description: dto.description ?? '',
    startAt: dto.startAt ?? null,
    endAt: dto.endAt ?? null,
    placeName: dto.placeName ?? null,
    placeId: dto.placeId ?? null,
    formattedAddress: dto.formattedAddress ?? null,
    localityLabel: dto.localityLabel ?? null,
    lat: dto.lat ?? null,
    lng: dto.lng ?? null,
    capacity: dto.capacity ?? null,
    priceCents,
    currency: dto.price?.currency ?? null,
    externalUrl: dto.externalUrl ?? null,
    waitlistEnabled: !!dto.waitlistEnabled,
    visibility: dto.visibility === 'private' ? 'private' : 'open',
    showOnMap: dto.showOnMap !== false,
    interestIds: (dto.interests ?? []).map((i) => i.id),
    schedule: dto.schedule ?? [],
    itinerary: dto.itinerary ?? [],
    recurrence: dto.recurrence
      ? { frequency: dto.recurrence.frequency, endsOn: dto.recurrence.endsOn ?? null }
      : null,
    imageUrls: (dto.images ?? []).map((i) => i.fullUrl || i.cardUrl),
  };
}

/** The API's money is in the smallest unit with its exponent; the wizard works in hundredths. */
const hundredths = (amount: number, exponent: number) => Math.round((amount / 10 ** exponent) * 100);
