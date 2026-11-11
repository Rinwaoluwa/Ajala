import type { Gender, Interest, PlaceRef, ProfileAbout, TravelStyle } from './Profile';

/**
 * Another traveller's profile (`PublicProfileDto`, spec §6): what anyone signed
 * in may see. No age or date of birth is ever sent.
 */
export type PublicProfile = {
  id: string;
  handle: string | null;
  /** First name and last initial. */
  displayName: string;
  avatarUrl: string | null;
  gender: Gender | null;
  /** Their home city. Null also when they hide it (`showCurrentCity` off). */
  homePlace: PlaceRef | null;
  interests: Interest[];
  about: Pick<ProfileAbout, 'bio' | 'pronouns' | 'tagline' | 'socialLinks' | 'photos' | 'verified'>;
  /** Language codes ("en"), as they chose them. */
  languages: string[];
  travelStyles: TravelStyle[];
  /** In their order. */
  favouriteDestinations: PlaceRef[];
  /** They said they are up for meeting people today (it switches itself off at their midnight). */
  openToMeetToday: boolean;
  /**
   * Their upcoming open plans are public, the profile's "Upcoming" tab
   * (`GET /users/:id/plans`); off means that list is empty. Not to be confused
   * with the trusted person ("Share my plan"), a separate feature.
   */
  sharePlans: boolean;
  memberSince: string;
  blockedByMe: boolean;
};

export type PostKind = 'meetup' | 'event' | 'plan' | 'group';

/**
 * A post on a profile — hosted or attended — as a compact card and as the
 * material achievements are worked out from (`PostCardDto`, trimmed).
 */
export type ProfileActivity = {
  id: string;
  type: PostKind;
  title: string;
  imageUrl: string | null;
  /** ISO date-time; null only on a draft. */
  startAt: string | null;
  placeName: string | null;
  /** The city and country of the post's place; null on a post with none (a draft). */
  locality: PostLocality | null;
  goingCount: number;
  capacity: number | null;
  interests: Interest[];
  photoCount: number;
  host: { id: string; name: string; avatarUrl: string | null };
  /** Null without the phone's location. */
  distanceKm: number | null;
  /** Whether the signed-in person saved it (the bookmark). */
  saved: boolean;
};

/**
 * Where a post is, as a card says it: `localityLabel` ("Lagos, Nigeria") and
 * the country code. Cards carry no city id any more, so the label is what
 * tells one city from another.
 */
export type PostLocality = { label: string; countryCode: string | null };

export type ActivityPage = {
  items: ProfileActivity[];
  nextCursor: string | null;
};

/** The "Saved activities" filter: `GET /me/saved?type=`. */
export type SavedFilter = 'all' | PostKind;

/** The lists `GET /me/rsvps?state=` reads (`waitlisted` since backend answers B8). */
export type RsvpListState = 'going' | 'requested' | 'waitlisted';

/**
 * The own profile's Going / Requested tabs. Requested is everything waiting to
 * get in, as on the Trips tab: requests, then waitlists.
 */
export type MyRsvpTab = 'going' | 'requested';

/** Where a tab has got to: which `/me/rsvps` list, and the cursor in it. */
export type RsvpCursor = { state: RsvpListState; cursor: string | null };

/** A post on those tabs, with the list it came from (which picks its tag). */
export type MyRsvp = { activity: ProfileActivity; state: RsvpListState };

export type MyRsvpPage = { items: MyRsvp[]; nextCursor: RsvpCursor | null };

/** The API's report reasons for a person (`ReportUserDto`). */
export type PersonReportReason = 'harassment' | 'impersonation' | 'spam' | 'inappropriate_content' | 'other';
