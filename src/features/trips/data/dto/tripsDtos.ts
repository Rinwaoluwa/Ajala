/**
 * Wire shapes for the Trips tab (spec §6: `PostCardDto`, `MyPostDto`,
 * `MyPostsPageDto`, `HostedPostsPageDto`), trimmed to the fields a trip card
 * reads or may soon read. Fields the API sends but a card never shows (lat/lng,
 * host, interests…) are left out.
 */

export type PostTypeDto = 'meetup' | 'event' | 'plan' | 'group';

export type RsvpStateDto = 'none' | 'requested' | 'going' | 'waitlisted' | 'declined' | 'removed';

export type RecurrenceDto = 'weekly' | 'biweekly' | 'monthly';

export interface PostImageDto {
  thumbUrl: string;
  cardUrl: string;
  fullUrl: string;
}

/** Display amount = `amountCents / 10 ** exponent` (spec §1.5). */
export interface PostPriceDto {
  amountCents: number;
  currency: string;
  exponent: number;
}

export interface PostRecurrenceDto {
  frequency: RecurrenceDto;
  /** YYYY-MM-DD; null means until the host stops it. */
  endsOn: string | null;
}

export interface PostCardDto {
  id: string;
  type: PostTypeDto;
  title: string;
  /** Always a list in the spec; read defensively since a draft may have none. */
  images: PostImageDto[] | null;
  /** Null only on a draft. */
  startAt: string | null;
  endAt: string | null;
  recurrence: PostRecurrenceDto | null;
  placeName: string | null;
  /** "Accra, Ghana": the city and country of the post's place. Null without a place (a draft). */
  localityLabel: string | null;
  /** Null when free or not given. There is no shared cost any more (backend answers C1). */
  price: PostPriceDto | null;
  /** Host not counted. */
  goingCount: number;
  rsvpState: RsvpStateDto;
  saved: boolean;
}

export interface MyPostDto extends PostCardDto {
  status: 'draft' | 'published' | 'taken_down' | 'cancelled';
  publishedAt: string | null;
  updatedAt: string;
}

export interface PageDto<T> {
  items: T[];
  nextCursor: string | null;
}
