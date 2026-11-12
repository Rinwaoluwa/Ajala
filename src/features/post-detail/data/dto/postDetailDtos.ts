/**
 * Wire shapes for the post page (spec §6: `PostDetailDto`, `AttendeesPageDto`,
 * `RsvpStateDto`, `CommentDto`), trimmed to what the page reads, as the
 * Swagger of 9 Nov 2026 has them.
 */

export type RsvpStateDto = 'none' | 'requested' | 'going' | 'waitlisted' | 'declined' | 'removed';

export interface PostImageDto {
  thumbUrl: string;
  cardUrl: string;
  fullUrl: string;
}

export interface HostCardDto {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  verified: boolean;
}

/** Money in its smallest unit; display amount = amountCents / 10 ** exponent (spec §1.5). */
export interface PostPriceDto {
  amountCents: number;
  currency: string;
  exponent: number;
}

export interface PostRecurrenceDto {
  frequency: 'weekly' | 'biweekly' | 'monthly';
  /** YYYY-MM-DD; null until stopped. */
  endsOn: string | null;
}

export interface InterestDto {
  id: string;
  slug: string;
  name: string;
  emoji: string | null;
}

export interface PostDetailDto {
  id: string;
  type: 'meetup' | 'event' | 'plan' | 'group';
  title: string;
  description: string | null;
  images: PostImageDto[] | null;
  startAt: string | null;
  endAt: string | null;
  recurrence: PostRecurrenceDto | null;
  /** The label under the card; the place's city name when the host gave none. */
  placeName: string | null;
  /** The Google place the host picked; null for a dropped pin. */
  placeId: string | null;
  formattedAddress: string | null;
  /** The city and country, e.g. "Lagos, Nigeria". */
  localityLabel: string | null;
  countryCode: string | null;
  lat: number | null;
  lng: number | null;
  capacity: number | null;
  /** Optional on Meetups, Events and Groups; a Plan never has one. */
  price: PostPriceDto | null;
  /** A link the host shares (tickets, a booking page). Joining still goes by RSVP. */
  externalUrl: string | null;
  goingCount: number;
  rsvpState: RsvpStateDto;
  /** True when the reader may not open it; `lockReason` says why (MOB-077). */
  locked?: boolean | null;
  lockReason?: 'plan' | 'distance' | null;
  visibility: 'open' | 'private';
  waitlistEnabled: boolean | null;
  waitlistPosition: number | null;
  status: 'draft' | 'published' | 'taken_down' | 'cancelled';
  isHost: boolean;
  host: HostCardDto;
  saved: boolean;
  interests: InterestDto[] | null;
  /** Events only; [] otherwise. */
  schedule: string[] | null;
  /** Plans only; [] otherwise. */
  itinerary: string[] | null;
  /** Only on the viewer's own post. */
  linkClickCount: number | null;
}

export interface AttendeeDto {
  user: HostCardDto;
  state: 'going' | 'requested' | 'waitlisted';
  since: string;
  position: number | null;
}

export interface AttendeesPageDto {
  items: AttendeeDto[];
  nextCursor: string | null;
  counts: { going: number; requested: number | null; waitlisted: number | null };
}

export interface RsvpStateResponseDto {
  state: RsvpStateDto;
  goingCount: number;
  capacity: number | null;
  waitlistPosition: number | null;
}

/** The few fields of `MeDto` the page reads. */
export interface MeDto {
  id: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

/** `CommentDto` (spec §6). A deleted top-level comment with replies has no author or body. */
export interface CommentDto {
  id: string;
  postId: string;
  /** The top-level comment this replies to. */
  parentId: string | null;
  author: HostCardDto | null;
  body: string | null;
  deleted: boolean;
  /** 0 on a reply. */
  replyCount: number;
  createdAt: string;
  mine: boolean;
  canDelete: boolean;
}

export interface CommentsPageDto {
  items: CommentDto[];
  nextCursor: string | null;
  /** Live comments + replies; 0 on a replies page. */
  total: number;
}

export interface CreateCommentDto {
  /** 1–1000 characters. */
  body: string;
  parentId?: string;
}

export interface ReportCommentDto {
  reason: 'harassment' | 'impersonation' | 'spam' | 'inappropriate_content' | 'other';
  /** ≤ 500; required with "other". */
  details?: string;
}
