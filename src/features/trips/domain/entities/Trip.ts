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
 * own post. `hosted` is a post of mine that is over (My posts): it reads
 * Completed, where one still to come reads Hosting.
 */
export type TripRole = 'hosting' | 'hosted' | 'going' | 'requested' | 'waitlisted' | 'attended';

/** How often a Group meets again; the server moves its dates on after each meeting. */
export type TripRecurrence = 'weekly' | 'biweekly' | 'monthly';

export type TripCard = {
  id: string;
  type: TripType;
  title: string;
  /** The 800px card image, or null when the post has none. */
  imageUrl: string | null;
  /** Every photo at card size, in the host's order, for the card's head. Empty when the post has none. */
  images: string[];
  /** As the API sends it (`amountCents / 10 ** exponent`); null when the post has no price. */
  price: { amountCents: number; currency: string; exponent: number } | null;
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

/** Someone going to a trip, as a card shows them beside "3 joining": their photo, or their initial. */
export type TripFace = { id: string; name: string; avatarUrl: string | null };

/** `mine` is My posts: everything I host, which the profile listed until 25 Nov. */
export type TripsTab = 'upcoming' | 'requests' | 'past' | 'mine';

/** The lists `GET /me/rsvps?state=` can read (spec §2.16; `waitlisted` since backend answers B8). */
export type RsvpListState = 'going' | 'requested' | 'waitlisted';

/**
 * Where the Requests tab has got to. It reads two lists one after the other —
 * my requests, then my waitlists — so its cursor says which list and where in it.
 */
export type WaitingCursor = { state: 'requested' | 'waitlisted'; cursor: string | null };

export type WaitingPage = { items: TripCard[]; nextCursor: WaitingCursor | null };
