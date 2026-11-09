/**
 * A post as its page shows it (`PostDetailDto`, spec §6), and the people going
 * to it (`AttendeeDto`). Free of the wire format: the data layer maps onto these.
 */

export type PostType = 'meetup' | 'event' | 'plan' | 'group';
export type RsvpState = 'none' | 'requested' | 'going' | 'waitlisted' | 'declined' | 'removed';
export type PostStatus = 'draft' | 'published' | 'taken_down' | 'cancelled';

/** An amount of money in its major unit ("15.5" dollars), with how many decimals the currency has. */
export type Money = { amount: number; currency: string; exponent: number };

export type PostPrice = Money;

export type Recurrence = 'weekly' | 'biweekly' | 'monthly';

/** A Group that meets again; the server moves `startAt`/`endAt` on after each meeting. */
export type PostRecurrence = { frequency: Recurrence; /** YYYY-MM-DD; null until stopped. */ endsOn: string | null };

export type PostInterest = { id: string; name: string; emoji: string | null };

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
  /** ISO date-time, after `startAt`; optional. */
  endAt: string | null;
  recurrence: PostRecurrence | null;
  /** The label under the card: the venue or meeting point, or the city when the host named none. */
  placeName: string | null;
  /** The Google place the host picked; null for a dropped pin. Opens the exact place in Google Maps. */
  placeId: string | null;
  /** Google's address for the place; null for a dropped pin. */
  formattedAddress: string | null;
  /** The city and country around the place: "Lagos, Nigeria". */
  localityLabel: string | null;
  /** ISO 3166-1 alpha-2, e.g. "NG". */
  countryCode: string | null;
  lat: number | null;
  lng: number | null;
  /** Null is no limit. */
  capacity: number | null;
  /** The host is not counted. */
  goingCount: number;
  /** The price, or nothing (no price is not "Free"). A Plan never has one. */
  price: PostPrice | null;
  /**
   * A link the host shares (tickets, a booking page). Every post joins by RSVP;
   * joining one with a link opens it too, and counts the click for the host.
   */
  externalUrl: string | null;
  rsvpState: RsvpState;
  visibility: 'open' | 'private';
  waitlistEnabled: boolean;
  /** 1 is next. */
  waitlistPosition: number | null;
  status: PostStatus;
  /** The server's word, also checked against the viewer's id (`asSeenBy`). */
  isHost: boolean;
  host: PostHost;
  /** Saved to the viewer's account (the bookmark). */
  saved: boolean;
  interests: PostInterest[];
  /** An Event's running order; empty on other types. */
  schedule: string[];
  /** A Plan's stops, in order; empty on other types. */
  itinerary: string[];
  /** How many people opened the post's link. The host's own post only; null otherwise. */
  linkClickCount: number | null;
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

/** The signed-in person: their id tells their own posts apart; the comment bar shows the rest. */
export type Viewer = { id: string; name: string; avatarUrl: string | null };

/** Who wrote a comment (null once it is deleted). */
export type CommentAuthor = { userId: string; name: string; avatarUrl: string | null };

/**
 * A comment under a post (`CommentDto`, spec §2.18). One level of replies: a
 * reply's `parentId` is the top-level comment it sits under.
 */
export type PostComment = {
  id: string;
  postId: string;
  /** The top-level comment this replies to; null on a top-level one. */
  parentId: string | null;
  /** Null on a deleted comment. */
  author: CommentAuthor | null;
  /** Null on a deleted comment. */
  body: string | null;
  /** A deleted top-level comment that still has replies: shown as "Comment deleted". */
  deleted: boolean;
  /** Live replies under it; 0 on a reply. */
  replyCount: number;
  /** ISO date-time. */
  createdAt: string;
  mine: boolean;
  /** Own comments, or any on a post the viewer hosts. */
  canDelete: boolean;
  /** Sent, not yet confirmed (shown dimmed). */
  pending?: boolean;
};

/** `total` counts live comments and replies, for the header; it is 0 on a page of replies. */
export type CommentsPage = { items: PostComment[]; total: number; nextCursor: string | null };

export type ReportReason = 'harassment' | 'impersonation' | 'spam' | 'inappropriate_content' | 'other';
