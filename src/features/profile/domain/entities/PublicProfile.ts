import type { CityRef, Interest, ProfileAbout } from './Profile';

/**
 * Another traveller's profile (`PublicProfileDto`, spec §6): what anyone signed
 * in may see. A date of birth is never shown — only an age band, and only when
 * they chose to show it.
 */
export type PublicProfile = {
  id: string;
  handle: string | null;
  /** First name and last initial. */
  displayName: string;
  avatarUrl: string | null;
  homeCity: CityRef | null;
  interests: Interest[];
  about: Pick<ProfileAbout, 'bio' | 'pronouns' | 'tagline' | 'photos' | 'verified'>;
  ageBand: string | null;
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
  city: CityRef;
  goingCount: number;
  capacity: number | null;
  interests: Interest[];
  photoCount: number;
};

export type ActivityPage = { items: ProfileActivity[]; nextCursor: string | null };

/** The API's report reasons for a person (`ReportUserDto`). */
export type PersonReportReason = 'harassment' | 'impersonation' | 'spam' | 'inappropriate_content' | 'other';
