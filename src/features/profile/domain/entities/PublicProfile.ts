import type { CityRef, Gender, Interest, ProfileAbout, TravelStyle } from './Profile';

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
  /** Null also when they hide their city (`showCurrentCity` off). */
  homeCity: CityRef | null;
  /** The city a trip of theirs covers today, when they share it. */
  visiting: CityRef | null;
  interests: Interest[];
  about: Pick<ProfileAbout, 'bio' | 'pronouns' | 'tagline' | 'photos' | 'verified'>;
  travelStyles: TravelStyle[];
  favouriteCities: CityRef[];
  /** They said they are up for meeting people today (it switches itself off at their midnight). */
  openToMeetToday: boolean;
  /** Their upcoming open plans are listed (`GET /users/:id/plans`); off means that list is empty. */
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
  /** Null on a post with no city (the API allows it, e.g. a draft). */
  city: CityRef | null;
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

export type ActivityPage = {
  items: ProfileActivity[];
  nextCursor: string | null;
};

/** The "Saved activities" filter: `GET /me/saved?type=`. */
export type SavedFilter = 'all' | PostKind;

/** The own profile's Going / Requested tabs: `GET /me/rsvps?state=`. */
export type RsvpListState = 'going' | 'requested';

/** The API's report reasons for a person (`ReportUserDto`). */
export type PersonReportReason = 'harassment' | 'impersonation' | 'spam' | 'inappropriate_content' | 'other';
