import { isApiError } from '@core/api/ApiError';

import { CreatePostError, type CreatePostErrorCode } from '../../domain/entities/CreatePostError';
import type { DraftCity, Interest, PostSubmission, SavedPost } from '../../domain/entities/PostDraft';
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
    checklist: s.checklist,
    status,
  };
}

/**
 * The PATCH body. A field left blank since the last save is cleared with null
 * (spec §6: "send null to clear"); the pin is sent or cleared as a pair.
 */
export function toUpdateBody(s: PostSubmission): UpdatePostDto {
  return {
    title: s.title,
    ...(s.description !== undefined ? { description: s.description } : null),
    ...(s.startAt !== undefined ? { startAt: s.startAt } : null),
    lat: s.lat ?? null,
    lng: s.lng ?? null,
    placeName: s.placeName ?? null,
    capacity: s.capacity ?? null,
    priceCents: s.priceCents ?? null,
    currency: s.currency ?? null,
    externalUrl: s.externalUrl ?? null,
    waitlistEnabled: s.waitlistEnabled,
    visibility: s.visibility,
    showOnMap: s.showOnMap,
    interestIds: s.interestIds,
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
  lat: dto.lat,
  lng: dto.lng,
});

/** By the API's code (spec §5, API map §5), never its message. */
export function toCreatePostError(e: unknown): CreatePostError {
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
    // The only plain conflict creating a post can meet is the 21st draft.
    CONFLICT: 'draftLimit',
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
  // The API's price is in the smallest unit with its exponent; the wizard works in hundredths.
  const priceCents = dto.price ? Math.round((dto.price.amountCents / 10 ** dto.price.exponent) * 100) : null;
  return {
    id: dto.id,
    type: dto.type,
    title: dto.title ?? '',
    description: dto.description ?? '',
    startAt: dto.startAt ?? null,
    placeName: dto.placeName ?? null,
    lat: dto.lat ?? null,
    lng: dto.lng ?? null,
    city: dto.city ? { id: dto.city.id, name: dto.city.name, label: dto.city.label } : null,
    capacity: dto.capacity ?? null,
    priceCents,
    currency: dto.price?.currency ?? null,
    externalUrl: dto.externalUrl ?? null,
    waitlistEnabled: !!dto.waitlistEnabled,
    visibility: dto.visibility === 'private' ? 'private' : 'open',
    showOnMap: dto.showOnMap !== false,
    interestIds: (dto.interests ?? []).map((i) => i.id),
    checklist: (dto.checklist ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((c) => c.text),
    imageUrls: (dto.images ?? []).map((i) => i.fullUrl || i.cardUrl),
  };
}
