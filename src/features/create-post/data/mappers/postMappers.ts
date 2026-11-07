import { isApiError } from '@core/api/ApiError';

import { CreatePostError, type CreatePostErrorCode } from '../../domain/entities/CreatePostError';
import type { DraftCity, Interest, PostSubmission, SavedPost } from '../../domain/entities/PostDraft';
import { canRepeat, needsCity, sharesCost } from '../../domain/rules/postDraftRules';
import type {
  CityDto,
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
    cityId: s.cityId,
    lat: s.lat,
    lng: s.lng,
    placeName: s.placeName,
    capacity: s.capacity,
    priceCents: s.priceCents,
    currency: s.currency,
    costTotalCents: s.cost?.totalCents,
    costCurrency: s.cost?.currency,
    expectedCount: s.cost?.expectedCount,
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
 * The PATCH body. A field left blank since the last save is cleared with null
 * (spec §6: "send null to clear"); the pin is sent or cleared as a pair, and the
 * cost split as a three.
 *
 * Fields only some types take are sent, even as null, only on those types: the
 * API answers a type-only field on the wrong type with a 400. `cityId` is sent
 * only without a pin, since the API refuses it while the post has one.
 */
export function toUpdateBody(s: PostSubmission): UpdatePostDto {
  const pinned = s.lat !== undefined && s.lng !== undefined;
  return {
    title: s.title,
    ...(s.description !== undefined ? { description: s.description } : null),
    ...(s.startAt !== undefined ? { startAt: s.startAt } : null),
    endAt: s.endAt ?? null,
    lat: s.lat ?? null,
    lng: s.lng ?? null,
    // Null here means the host's home city, as a fresh post without either would get.
    ...(!pinned && needsCity(s.type) ? { cityId: s.cityId ?? null } : null),
    placeName: s.placeName ?? null,
    capacity: s.capacity ?? null,
    // Cleared on a Plan or Group too: older drafts carried their split as a price.
    priceCents: s.priceCents ?? null,
    currency: s.currency ?? null,
    ...(sharesCost(s.type)
      ? {
          costTotalCents: s.cost?.totalCents ?? null,
          costCurrency: s.cost?.currency ?? null,
          expectedCount: s.cost?.expectedCount ?? null,
        }
      : null),
    externalUrl: s.externalUrl ?? null,
    waitlistEnabled: s.waitlistEnabled,
    visibility: s.visibility,
    showOnMap: s.showOnMap,
    interestIds: s.interestIds,
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

export const toDraftCity = (dto: CityDto): DraftCity => ({
  id: dto.id,
  name: dto.name,
  label: dto.label || dto.name,
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
    lat: dto.lat ?? null,
    lng: dto.lng ?? null,
    city: dto.city ? { id: dto.city.id, name: dto.city.name, label: dto.city.label } : null,
    capacity: dto.capacity ?? null,
    priceCents,
    currency: dto.price?.currency ?? null,
    costSplit: dto.costSplit
      ? {
          totalCents: hundredths(dto.costSplit.totalCents, dto.costSplit.exponent),
          currency: dto.costSplit.currency,
          expectedCount: dto.costSplit.expectedCount,
        }
      : null,
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
