import type { Gender, MyProfile, TravelStyle } from '../entities/Profile';

/**
 * The rules of profile setup: the choices each step offers, how many may be
 * picked, and what a step needs before Continue lights up.
 *
 * The lists that are not the server's (languages, genders, travel styles) are
 * fixed here because the design fixes them. Interests are the server's
 * (`GET /interests`) and destinations are Google cities; only their bounds, and
 * the few city names offered as quick searches, are here.
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
 * Not in the design. Optional: the `GET /me` description says name and date of
 * birth complete a profile and gender is never needed, though one field text
 * still lists it (spec §2.4, §8.1, an open question). So setup offers it and
 * sends it when picked, but never waits on it. Flagged to design.
 */
export const GENDERS: readonly Option<Gender>[] = [
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

/**
 * "How do you like to travel?": the design's chips, in its order, as the API's
 * `TravelStyle` values (`extras.travelStyles`). These 36 chips match the 36
 * values one to one. The API map counts 40 chips in Figma; any beyond these
 * have no value to save as, so they are left out until design and backend
 * settle the difference (API map §12).
 */
export const TRAVEL_STYLES: readonly Option<TravelStyle>[] = [
  { value: 'family', label: 'Family' },
  { value: 'solo', label: 'Solo' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'local_life', label: 'Local life' },
  { value: 'rail_travel', label: 'Rail travel' },
  { value: 'diving', label: 'Diving' },
  { value: 'art_lover', label: 'Art lover' },
  { value: 'backpacker', label: 'Backpacker' },
  { value: 'skiing', label: 'Skiing' },
  { value: 'cruise', label: 'Cruise' },
  { value: 'cycling', label: 'Cycling' },
  { value: 'eco_travel', label: 'Eco travel' },
  { value: 'safari', label: 'Safari' },
  { value: 'nightlife', label: 'Nightlife' },
  { value: 'foodie', label: 'Foodie' },
  { value: 'beach', label: 'Beach' },
  { value: 'festivals', label: 'Festivals' },
  { value: 'spiritual', label: 'Spiritual' },
  { value: 'road_trip', label: 'Road trip' },
  { value: 'mountains', label: 'Mountains' },
  { value: 'culture', label: 'Culture' },
  { value: 'hiking', label: 'Hiking' },
  { value: 'surfing', label: 'Surfing' },
  { value: 'sailing', label: 'Sailing' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'photography', label: 'Photography' },
  { value: 'adventurer', label: 'Adventurer' },
  { value: 'budget', label: 'Budget' },
  { value: 'staycation', label: 'Staycation' },
  { value: 'city_break', label: 'City break' },
  { value: 'history', label: 'History' },
  { value: 'digital_nomad', label: 'Digital nomad' },
  { value: 'snow_escape', label: 'Snow escape' },
  { value: 'glamping', label: 'Glamping' },
  { value: 'couples', label: 'Couples' },
  { value: 'camping', label: 'Camping' },
];
/** The API's cap on `extras.travelStyles` (spec §4). */
export const MAX_TRAVEL_STYLES = 10;

/** A style's chip label; an unknown value (a newer API) shows as itself. */
export const travelStyleLabel = (value: string): string =>
  TRAVEL_STYLES.find((s) => s.value === value)?.label ?? value.replace(/_/g, ' ');

/**
 * "Where do you love to travel?": up to ten cities, by Google place id
 * (`extras.favouriteDestinationIds`; an 11th is a 400).
 */
export const MAX_DESTINATIONS = 10;

/**
 * Quick searches offered under the destinations search. The API used to rank
 * popular cities (`GET /cities/popular`); that is gone and Swagger has nothing
 * in its place, so these are a short fixed list of well-known cities. Tapping
 * one searches for it, so what is saved is still a real Google place the
 * person chose, never a guessed id. Every name is also in the demo's places.
 */
export const POPULAR_DESTINATION_SEARCHES: readonly string[] = [
  'London',
  'Paris',
  'Lisbon',
  'Barcelona',
  'Amsterdam',
  'Dubai',
  'New York',
  'Cape Town',
  'Accra',
  'Nairobi',
];

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
 * What the profile still lacks of the fields setup must collect: name and date
 * of birth. Email sign-ups send both; a Google or Apple account may arrive
 * without a date of birth, and Apple may withhold the name. Setup asks only for
 * what is missing. Whether the profile then counts as complete is the server's
 * call (`profileCompletedAt`), not worked out here.
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
  /** The home city's Google place id. */
  homePlaceId: string | null;
  languages: readonly string[];
  gender: Gender | null;
  fullName: string;
  dateOfBirth: string | null;
};

/** Gender is in the draft but never required (see `GENDERS`). */
export function canContinueBasics(draft: BasicsDraft, missing: MissingBasics): boolean {
  return (
    draft.homePlaceId !== null &&
    draft.languages.length > 0 &&
    (!missing.name || isFullNameValid(draft.fullName)) &&
    (!missing.dateOfBirth || draft.dateOfBirth !== null)
  );
}
