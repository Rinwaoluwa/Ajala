/**
 * Wire shapes for the post page (spec §6: `PostDetailDto`, `AttendeesPageDto`,
 * `RsvpStateDto`), trimmed to what the page reads. The repo's OpenAPI copy has
 * no post paths yet, so these follow the client spec.
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

export interface PostDetailDto {
  id: string;
  type: 'meetup' | 'event' | 'plan' | 'group';
  title: string;
  description: string | null;
  images: PostImageDto[] | null;
  startAt: string | null;
  placeName: string | null;
  lat: number | null;
  lng: number | null;
  city: { id: string; name: string; label: string } | null;
  capacity: number | null;
  price: { amountCents: number; currency: string; exponent: number } | null;
  externalUrl: string | null;
  joinMode: 'rsvp' | 'external';
  goingCount: number;
  rsvpState: RsvpStateDto;
  visibility: 'open' | 'private';
  waitlistEnabled: boolean | null;
  waitlistPosition: number | null;
  status: 'draft' | 'published' | 'taken_down' | 'cancelled';
  isHost: boolean;
  host: HostCardDto;
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
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

/**
 * PROPOSED — comments are not in the API yet (API map §12). The shape the app
 * expects, for the backend to confirm.
 */
export interface CommentDto {
  id: string;
  user: { id: string; displayName: string; avatarUrl: string | null };
  text: string;
  createdAt: string;
  replyTo: { id: string; displayName: string } | null;
}

export interface CommentsPageDto {
  items: CommentDto[];
  nextCursor: string | null;
  total: number;
}
