/**
 * A post as its page shows it (`PostDetailDto`, spec §6), and the people going
 * to it (`AttendeeDto`). Free of the wire format: the data layer maps onto these.
 */

export type PostType = 'meetup' | 'event' | 'plan' | 'group';
export type RsvpState = 'none' | 'requested' | 'going' | 'waitlisted' | 'declined' | 'removed';
export type PostStatus = 'draft' | 'published' | 'taken_down' | 'cancelled';

export type PostPrice = { amount: number; currency: string };

export type PostHost = { id: string; name: string; avatarUrl: string | null; verified: boolean };

export type PostDetail = {
  id: string;
  type: PostType;
  title: string;
  description: string;
  /** Full-size photo URLs, the cover first. */
  images: string[];
  /** ISO date-time; null only on a draft. */
  startAt: string | null;
  placeName: string | null;
  cityLabel: string | null;
  lat: number | null;
  lng: number | null;
  /** Null is no limit. */
  capacity: number | null;
  /** The host is not counted. */
  goingCount: number;
  price: PostPrice | null;
  externalUrl: string | null;
  /** `external`: a paid Event booked through its link, never RSVPed. */
  joinMode: 'rsvp' | 'external';
  rsvpState: RsvpState;
  visibility: 'open' | 'private';
  waitlistEnabled: boolean;
  /** 1 is next. */
  waitlistPosition: number | null;
  status: PostStatus;
  isHost: boolean;
  host: PostHost;
};

export type AttendeeState = 'going' | 'requested' | 'waitlisted';

export type Attendee = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  state: AttendeeState;
  /** Waitlist only. */
  position: number | null;
};

export type AttendeesPage = {
  items: Attendee[];
  nextCursor: string | null;
  /** `requested` and `waitlisted` are the host's only. */
  counts: { going: number; requested: number | null; waitlisted: number | null };
};

/** What joining or leaving answered (`RsvpStateDto`). */
export type RsvpResult = {
  state: RsvpState;
  goingCount: number;
  capacity: number | null;
  waitlistPosition: number | null;
};

/** The signed-in person, as the comment bar shows them. */
export type Viewer = { name: string; avatarUrl: string | null };

/**
 * A comment under a post. The API has no comments yet (API map §12): the
 * proposed endpoint is in `data/datasources/remote/postDetailApi.ts`.
 */
export type PostComment = {
  id: string;
  author: { userId: string; name: string; avatarUrl: string | null };
  text: string;
  /** ISO date-time. */
  createdAt: string;
  /** The person this answers, when it is a reply. */
  replyTo: { commentId: string; name: string } | null;
  /** Sent, not yet confirmed (shown dimmed). */
  pending?: boolean;
};

export type CommentsPage = { items: PostComment[]; total: number; nextCursor: string | null };
