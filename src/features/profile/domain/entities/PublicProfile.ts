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
  /**
   * Every photo, in the host's order: `card` for a card's head, `full` for the
   * viewer. Empty when the post has none.
   */
  images: { card: string; full: string }[];
  /** ISO date-time; null only on a draft. */
  startAt: string | null;
  placeName: string | null;
  /** The city and country of the post's place; null on a post with none (a draft). */
  locality: PostLocality | null;
  /** As the API sends it (`amountCents / 10 ** exponent`); null when the post has no price. */
  price: { amountCents: number; currency: string; exponent: number } | null;
  /** How the reader stands with it, for a card's Join. */
  rsvpState: 'none' | 'requested' | 'going' | 'waitlisted' | 'declined' | 'removed';
  /** A private post asks its host before letting anyone in. */
  visibility: 'open' | 'private';
  goingCount: number;
  capacity: number | null;
  interests: Interest[];
  photoCount: number;
  host: { id: string; name: string; avatarUrl: string | null };
  /** Null without the phone's location. */
  distanceKm: number | null;
  /** Whether the signed-in person saved it (the bookmark). */
  saved: boolean;
  /**
   * Why the reader may not open it (MOB-077): a Plan, or outside their area,
   * without Pro. Null when open. A locked card opens the paywall, not the post.
   */
  lockReason: ActivityLock | null;
};

/** Why a post is locked to its reader (MOB-077). */
export type ActivityLock = 'plan' | 'distance';

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

/** The API's report reasons for a person (`ReportUserDto`). */
export type PersonReportReason = 'harassment' | 'impersonation' | 'spam' | 'inappropriate_content' | 'other';
