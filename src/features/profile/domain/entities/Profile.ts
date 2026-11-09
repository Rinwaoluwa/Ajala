/**
 * The signed-in person's own profile, as profile setup and editing see it
 * (`MeDto`, trimmed to what they use).
 *
 * Before setup most of it is empty: `gender` and `homePlace` are nullable in
 * the spec (§6) and stay null until the person fills them in. `visiting` is
 * not read: the API always sends null while trips are parked (backend answers A9).
 */

export type Gender = 'woman' | 'man' | 'non_binary' | 'prefer_not_to_say';

/**
 * The API's fixed list of travel styles (`TravelStyle`, spec §6). Setup's chips
 * map their labels onto these (`TRAVEL_STYLES` in the rules).
 */
export type TravelStyle =
  | 'family'
  | 'solo'
  | 'shopping'
  | 'local_life'
  | 'rail_travel'
  | 'diving'
  | 'art_lover'
  | 'backpacker'
  | 'skiing'
  | 'cruise'
  | 'cycling'
  | 'eco_travel'
  | 'safari'
  | 'nightlife'
  | 'foodie'
  | 'beach'
  | 'festivals'
  | 'spiritual'
  | 'road_trip'
  | 'mountains'
  | 'culture'
  | 'hiking'
  | 'surfing'
  | 'sailing'
  | 'luxury'
  | 'photography'
  | 'adventurer'
  | 'budget'
  | 'staycation'
  | 'city_break'
  | 'history'
  | 'digital_nomad'
  | 'snow_escape'
  | 'glamping'
  | 'couples'
  | 'camping';

/**
 * A city, by its Google place id (`PlaceRefDto`, spec §1.6). The API keeps
 * every place as a Google id now; there is no city catalogue any more.
 */
export type PlaceRef = {
  /** The Google place id the API takes back (`homePlaceId`, `favouriteDestinationIds`). */
  placeId: string;
  /** The short form for a chip: "Lagos". */
  name: string;
  /** The display form: "Lagos, Nigeria". */
  label: string;
  /** ISO 3166-1 alpha-2; null when the server or the search did not say. */
  countryCode: string | null;
};

/**
 * "Current city" as the phone finds it. The person cannot pick it: it is where
 * they are. When it cannot be found the screen says why and offers the fix.
 *
 * - `found`: the city the phone is in.
 * - `noPermission`: location is off for the app. `blocked` when only the
 *   system Settings can turn it back on.
 * - `notFound`: location is on, but no position or no city came back (no
 *   signal, Google unreachable, or nowhere near a city). Trying again may help.
 */
export type CityDetection =
  | { kind: 'found'; city: PlaceRef }
  | { kind: 'noPermission'; blocked: boolean }
  | { kind: 'notFound' };

/** A row of the city search: the city, and the line under its name ("Nigeria"). */
export type CitySuggestion = PlaceRef & { detail: string };

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
  /** Home city (`MeDto.homePlace`). */
  homePlace: PlaceRef | null;
  interests: Interest[];
  /** ISO 639-1 codes. */
  languages: string[];
  /** "How do you like to travel?" (`extras.travelStyles`), up to 10. */
  travelStyles: TravelStyle[];
  /**
   * "Where do you love to travel?" (`MeDto.favouriteDestinations`, saved as
   * `extras.favouriteDestinationIds`), up to 10, in the person's order.
   */
  favouriteDestinations: PlaceRef[];
  /** Travel (the subscription) is on right now. */
  subscribed: boolean;
  /**
   * Set by the server once the profile is complete; null until then. Always read
   * from `GET /me`, never worked out here: which fields complete a profile is
   * still disputed (gender, spec §2.4 / §8.1).
   */
  profileCompletedAt: string | null;
  /** What the profile page shows beyond setup (GET /me); absent on records built during setup. */
  about?: ProfileAbout;
};

/** A photo in the person's gallery (`ProfilePhotoDto`): 1280px and 400px. */
export type ProfilePhoto = { id: string; url: string; thumbUrl: string };

export type SocialLinks = {
  instagram: string | null;
  tiktok: string | null;
  website: string | null;
};

/** The profile page's extras: bio, pronouns, tagline, links, gallery, badge. */
export type ProfileAbout = {
  bio: string | null;
  pronouns: string | null;
  tagline: string | null;
  socialLinks: SocialLinks;
  photos: ProfilePhoto[];
  /**
   * An admin badge: the Ajala team has reviewed this profile (backend answers A9).
   * It says nothing about identity, so it must never be worded as "ID verified".
   */
  verified: boolean;
};

/** What a `PATCH /me` may change. Fields left out are left alone. */
export type ProfileUpdate = {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: Gender;
  handle?: string;
  /** A city's Google place id. */
  homePlaceId?: string;
  interestIds?: string[];
  languages?: string[];
  /** An empty list clears them. */
  travelStyles?: TravelStyle[];
  /** Cities' Google place ids, up to 10 (an 11th is a 400). */
  favouriteDestinationIds?: string[];
  /** IANA zone. Setup sends it so its `PATCH /me` is never empty (see `makeSaveSetup`). */
  timezone?: string;
};

export type HandleAvailability =
  { available: true } | { available: false; reason: 'taken' | 'reserved' | 'format' };

/** A photo ready to upload: a local file and its type. */
export type ImageFile = { uri: string; name: string; type: string };
