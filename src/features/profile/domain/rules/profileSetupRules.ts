import type { Gender, MyProfile } from '../entities/Profile';

/**
 * The rules of profile setup: the choices each step offers, how many may be
 * picked, and what a step needs before Continue lights up.
 *
 * The lists that are not the server's (languages, genders, travel styles,
 * destinations) are fixed here because the design fixes them. Interests are the
 * server's (`GET /interests`); only their bounds are here.
 */

export type Option<T extends string = string> = { value: T; label: string };

/** The design's chips, in its order, as the ISO 639-1 codes `extras.languages` takes. */
export const LANGUAGES: readonly Option[] = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Mandarin' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'it', label: 'Italian' },
  { value: 'ar', label: 'Arabic' },
];
/** The API's cap on `extras.languages`. */
export const MAX_LANGUAGES = 10;

/**
 * Not in the design: the API needs a gender before a profile counts as complete
 * (§2.4), so "Set up your profile" asks for it. Agreed with product; flagged to design.
 */
export const GENDERS: readonly Option<Gender>[] = [
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

/**
 * "How do you like to travel?" The backend has no field for these yet (API map
 * §12): the step is shown and the choice is not kept, as agreed with product.
 */
export const TRAVEL_STYLES: readonly string[] = [
  'Family',
  'Solo',
  'Shopping',
  'Local life',
  'Rail travel',
  'Diving',
  'Art lover',
  'Backpacker',
  'Skiing',
  'Cruise',
  'Cycling',
  'Eco travel',
  'Safari',
  'Nightlife',
  'Foodie',
  'Beach',
  'Festivals',
  'Spiritual',
  'Road trip',
  'Mountains',
  'Culture',
  'Hiking',
  'Surfing',
  'Sailing',
  'Luxury',
  'Photography',
  'Adventurer',
  'Budget',
  'Staycation',
  'City break',
  'History',
  'Digital nomad',
  'Snow escape',
  'Glamping',
  'Couples',
  'Camping',
];

/** "Where do you love to travel?" Also not stored yet (API map §12). */
export const POPULAR_DESTINATIONS: readonly string[] = [
  'Oslo',
  'Amsterdam',
  'Prague',
  'London',
  'Vienna',
  'Dublin',
  'Bangkok',
  'Havana',
  'Athens',
  'Bali',
  'Dubai',
  'Boston',
  'Austin',
  'Madrid',
  'Berlin',
  'Zurich',
  'Miami',
  'Seoul',
  'Milan',
  'Chicago',
];
export const MAX_DESTINATIONS = 10;

/** "Choose 5–8 interests". The API accepts 3–8; the screen's own rule is 5. */
export const MIN_INTERESTS = 5;
export const MAX_INTERESTS = 8;

/** Adds `value`, or takes it out if present. A full list is left as it is. */
export function toggle<T>(list: readonly T[], value: T, max = Infinity): T[] {
  if (list.includes(value)) return list.filter((v) => v !== value);
  return list.length >= max ? [...list] : [...list, value];
}

export const canContinueInterests = (count: number): boolean =>
  count >= MIN_INTERESTS && count <= MAX_INTERESTS;

/**
 * What the profile still lacks of the four fields the API completes it on.
 * Gender is never asked at sign-up; a Google or Apple account also arrives
 * without a date of birth, and Apple may withhold the name. Setup asks only for
 * what is missing.
 */
export type MissingBasics = { name: boolean; dateOfBirth: boolean };

export function missingBasics(
  profile: Pick<MyProfile, 'firstName' | 'lastName' | 'dateOfBirth'>,
): MissingBasics {
  return {
    name: !profile.firstName?.trim() || !profile.lastName?.trim(),
    dateOfBirth: !profile.dateOfBirth,
  };
}

/** Splits "Sarah Jane Mitchell" into "Sarah" and "Jane Mitchell", as sign-up does. */
export function splitFullName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const trimmed = fullName.trim().replace(/\s+/g, ' ');
  const space = trimmed.indexOf(' ');
  return space === -1
    ? { firstName: trimmed, lastName: '' }
    : {
        firstName: trimmed.slice(0, space),
        lastName: trimmed.slice(space + 1),
      };
}

export const NAME_MAX = 60;

export function isFullNameValid(fullName: string): boolean {
  const { firstName, lastName } = splitFullName(fullName);
  return (
    firstName.length > 0 && lastName.length > 0 && firstName.length <= NAME_MAX && lastName.length <= NAME_MAX
  );
}

export type BasicsDraft = {
  homeCityId: string | null;
  languages: readonly string[];
  gender: Gender | null;
  fullName: string;
  dateOfBirth: string | null;
};

export function canContinueBasics(draft: BasicsDraft, missing: MissingBasics): boolean {
  return (
    draft.homeCityId !== null &&
    draft.languages.length > 0 &&
    draft.gender !== null &&
    (!missing.name || isFullNameValid(draft.fullName)) &&
    (!missing.dateOfBirth || draft.dateOfBirth !== null)
  );
}
