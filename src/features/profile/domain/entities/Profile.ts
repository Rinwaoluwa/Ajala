/**
 * The signed-in person's own profile, as profile setup and editing see it
 * (`MeDto`, trimmed to what they use).
 *
 * Before setup most of it is empty: the spec types `gender` and `homeCity` as
 * required, but says to treat them as possibly null until onboarding is done
 * (§6), and so they are here.
 */

export type Gender = 'woman' | 'man' | 'non_binary' | 'prefer_not_to_say';

/** A city as other records refer to it. `label` is the display form, e.g. "London, UK". */
export type CityRef = {
  id: string;
  name: string;
  countryCode: string;
  label: string;
};

export type City = CityRef & {
  /** State or province; empty where there is none. */
  region: string;
  countryName: string;
};

/** One of the server's interests ("What are you into?"). */
export type Interest = {
  id: string;
  slug: string;
  name: string;
  emoji: string | null;
};

export type MyProfile = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  handle: string | null;
  /** YYYY-MM-DD. */
  dateOfBirth: string | null;
  gender: Gender | null;
  avatarUrl: string | null;
  homeCity: CityRef | null;
  interests: Interest[];
  /** ISO 639-1 codes. */
  languages: string[];
  /** Null until first name, last name, date of birth and gender are all set. */
  profileCompletedAt: string | null;
};

/** What a `PATCH /me` may change. Fields left out are left alone. */
export type ProfileUpdate = {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: Gender;
  handle?: string;
  homeCityId?: string;
  interestIds?: string[];
  languages?: string[];
};

export type HandleAvailability =
  { available: true } | { available: false; reason: 'taken' | 'reserved' | 'format' };

/** A photo ready to upload: a local file and its type. */
export type ImageFile = { uri: string; name: string; type: string };
