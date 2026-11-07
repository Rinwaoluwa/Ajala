/**
 * Wire shapes for creating a post (spec §6: `CreatePostDto`, `UpdatePostDto`,
 * `PostDetailDto`), trimmed to what the wizard sends and reads back. The repo's
 * OpenAPI copy has no post paths yet, so these follow the client spec.
 */

export type PostTypeDto = 'meetup' | 'event' | 'plan' | 'group';
export type RecurrenceDto = 'weekly' | 'biweekly' | 'monthly';

/** `POST /posts` is multipart; this is its text fields before they go into the form. */
export interface CreatePostFieldsDto {
  type: PostTypeDto;
  title: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  /** A Plan or Group with no pin. */
  cityId?: string;
  lat?: number;
  lng?: number;
  placeName?: string;
  capacity?: number;
  priceCents?: number;
  currency?: string;
  externalUrl?: string;
  waitlistEnabled?: boolean;
  visibility?: 'open' | 'private';
  showOnMap?: boolean;
  interestIds?: string[];
  /** Events only; one form field per line. */
  schedule?: string[];
  /** Plans only; one form field per line. */
  itinerary?: string[];
  /** Plans and Groups: all three or none. */
  costTotalCents?: number;
  costCurrency?: string;
  expectedCount?: number;
  /** Groups only. */
  recurrence?: RecurrenceDto;
  /** Groups only, YYYY-MM-DD. */
  recurrenceEndsOn?: string;
  status?: 'draft' | 'published';
}

/** `PATCH /posts/:id` (JSON): only what is sent changes; null clears. */
export interface UpdatePostDto {
  title?: string;
  description?: string;
  startAt?: string;
  endAt?: string | null;
  /** Refused while the post has a pin; null means the host's home city. */
  cityId?: string | null;
  lat?: number | null;
  lng?: number | null;
  placeName?: string | null;
  capacity?: number | null;
  priceCents?: number | null;
  currency?: string | null;
  externalUrl?: string | null;
  waitlistEnabled?: boolean;
  visibility?: 'open' | 'private';
  showOnMap?: boolean;
  interestIds?: string[];
  /** The whole list; null clears it. */
  schedule?: string[] | null;
  itinerary?: string[] | null;
  /** All three, or null on all three. */
  costTotalCents?: number | null;
  costCurrency?: string | null;
  expectedCount?: number | null;
  /** Null stops it repeating. */
  recurrence?: RecurrenceDto | null;
  recurrenceEndsOn?: string | null;
}

/** What the wizard reads from the answer: only the id. */
export interface PostDetailDto {
  id: string;
  status: 'draft' | 'published' | 'taken_down' | 'cancelled';
}

/** `GET /posts/:id`, read back to carry on editing a draft (spec §6 `PostDetailDto`). */
export interface SavedPostDto {
  id: string;
  type: PostTypeDto;
  title: string;
  description: string | null;
  startAt: string | null;
  endAt: string | null;
  placeName: string | null;
  lat: number | null;
  lng: number | null;
  city: { id: string; name: string; label: string } | null;
  capacity: number | null;
  price: { amountCents: number; currency: string; exponent: number } | null;
  /** Plans and Groups splitting a cost; the server works out `perPersonCents`. */
  costSplit: {
    totalCents: number;
    currency: string;
    exponent: number;
    expectedCount: number;
    perPersonCents: number;
  } | null;
  recurrence: { frequency: RecurrenceDto; endsOn: string | null } | null;
  externalUrl: string | null;
  waitlistEnabled: boolean;
  visibility: 'open' | 'private';
  showOnMap: boolean;
  interests: { id: string }[] | null;
  /** Events only; [] otherwise. */
  schedule: string[] | null;
  /** Plans only; [] otherwise. */
  itinerary: string[] | null;
  images: { thumbUrl: string; cardUrl: string; fullUrl: string }[] | null;
}

export interface InterestDto {
  id: string;
  slug: string;
  name: string;
  emoji: string | null;
}

export interface CityDto {
  id: string;
  name: string;
  countryCode: string;
  label: string;
  region: string;
  countryName: string;
  lat: number;
  lng: number;
}

/** A file as React Native's FormData takes it. */
export type UploadFile = { uri: string; name: string; type: string };
