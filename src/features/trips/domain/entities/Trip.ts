/**
 * A trip on the Trips tab: a post I host or am going to (Upcoming), am waiting
 * to get into — asked to join, or on the waitlist (Requests) — or went to
 * (Past), trimmed to what its card shows (`PostCardDto` / `MyPostDto`, spec §6).
 */

export type TripType = 'meetup' | 'event' | 'plan' | 'group';

/** Where a post stands. Only my own posts say; every other list holds live posts. */
export type TripStatus = 'draft' | 'published' | 'taken_down' | 'cancelled';

/**
 * How I relate to the post, which picks the card's tag (Hosting, Going,
 * Request sent, Waitlisted, Completed). It comes from the list the post was
 * read from, not the card's `rsvpState`, because a host has no RSVP on their
 * own post.
 */
export type TripRole = 'hosting' | 'going' | 'requested' | 'waitlisted' | 'attended';

/** How often a Group meets again; the server moves its dates on after each meeting. */
export type TripRecurrence = 'weekly' | 'biweekly' | 'monthly';

export type TripCard = {
  id: string;
  type: TripType;
  title: string;
  /** The 800px card image, or null when the post has none. */
  imageUrl: string | null;
  /** ISO date-time; null only on a draft. */
  startAt: string | null;
  /** ISO date-time after `startAt`, or null when the host gave no end. */
  endAt: string | null;
  recurrence: TripRecurrence | null;
  placeName: string | null;
  /** "Accra, Ghana": the city and country of the post's place (`localityLabel`), or '' when it has none. */
  localityLabel: string;
  /** Host not counted. */
  goingCount: number;
  status: TripStatus;
  role: TripRole;
};

export type TripsPage = { items: TripCard[]; nextCursor: string | null };

export type TripsTab = 'upcoming' | 'requests' | 'past';

/** The lists `GET /me/rsvps?state=` can read (spec §2.16; `waitlisted` since backend answers B8). */
export type RsvpListState = 'going' | 'requested' | 'waitlisted';

/**
 * Where the Requests tab has got to. It reads two lists one after the other —
 * my requests, then my waitlists — so its cursor says which list and where in it.
 */
export type WaitingCursor = { state: 'requested' | 'waitlisted'; cursor: string | null };

export type WaitingPage = { items: TripCard[]; nextCursor: WaitingCursor | null };
