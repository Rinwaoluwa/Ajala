/**
 * A trip on the Trips tab: a post the person hosts (Upcoming) or went to
 * (Past), trimmed to what its card shows (`MyPostDto` / `PostCardDto`).
 */

export type TripType = 'meetup' | 'event' | 'plan' | 'group';

/** Where a post stands. Attended posts are all `published`. */
export type TripStatus = 'draft' | 'published' | 'taken_down' | 'cancelled';

export type TripCard = {
  id: string;
  type: TripType;
  title: string;
  /** The 800px card image, or null when the post has none. */
  imageUrl: string | null;
  /** ISO date-time; null only on a draft. */
  startAt: string | null;
  placeName: string | null;
  /** "Accra, Ghana": the post's catalog city. */
  cityLabel: string;
  /** Host not counted. */
  goingCount: number;
  status: TripStatus;
};

export type TripsPage = { items: TripCard[]; nextCursor: string | null };

export type TripsTab = 'upcoming' | 'requests' | 'past';
