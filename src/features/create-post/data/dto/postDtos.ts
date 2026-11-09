/**
 * Wire shapes for creating a post (spec §6: `CreatePostDto`, `UpdatePostDto`,
 * `PostDetailDto`), trimmed to what the wizard sends and reads back, as the
 * Swagger of 9 Nov 2026 has them.
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
  /**
   * A Google place id (a venue, or a Plan's or Group's destination); the server
   * looks up its coordinates and address. Never with `lat`/`lng`.
   */
  placeId?: string;
  /** A pin, with `lng`. Never with `placeId`. */
  lat?: number;
  lng?: number;
  /** The label under the card; the place's city name when left out. */
  placeName?: string;
  capacity?: number;
  /** Meetups, Events and Groups; a Plan carries no money (a 400 on one). */
  priceCents?: number;
  currency?: string;
  /** Meetups, Events and Groups, as `priceCents`. */
  externalUrl?: string;
  waitlistEnabled?: boolean;
  visibility?: 'open' | 'private';
  showOnMap?: boolean;
  interestIds?: string[];
  /** Events only; one form field per line. */
  schedule?: string[];
  /** Plans only; one form field per line. */
  itinerary?: string[];
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
  /** Moves the post to a Google place. Not nullable, never with `lat`/`lng`. */
  placeId?: string;
  /**
   * Moves the pin; both or neither. Not nullable: a post keeps a place once it
   * has one, so to leave it as it is, leave these out.
   */
  lat?: number;
  lng?: number;
  /** Null clears it (the card then shows the place's city). */
  placeName?: string | null;
  capacity?: number | null;
  /** Not on a Plan, not even as null. */
  priceCents?: number | null;
  currency?: string | null;
  externalUrl?: string | null;
  waitlistEnabled?: boolean;
  visibility?: 'open' | 'private';
  showOnMap?: boolean;
  interestIds?: string[];
  /** The whole list, at most 30 lines of 120 characters; null clears it. */
  schedule?: string[] | null;
  itinerary?: string[] | null;
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
  /** The Google place the host picked; null for a dropped pin or no place yet. */
  placeId: string | null;
  formattedAddress: string | null;
  /** The city and country, e.g. "Lagos, Nigeria". */
  localityLabel: string | null;
  countryCode: string | null;
  lat: number | null;
  lng: number | null;
  capacity: number | null;
  /** Null when the host gave no price, and always on a Plan. */
  price: { amountCents: number; currency: string; exponent: number } | null;
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

/** A file as React Native's FormData takes it. */
export type UploadFile = { uri: string; name: string; type: string };
