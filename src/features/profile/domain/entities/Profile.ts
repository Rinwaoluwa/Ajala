/**
 * The signed-in person's own profile, as profile setup and editing see it
 * (`MeDto`, trimmed to what they use).
 *
 * Before setup most of it is empty: `gender`, `homeCity` and `visiting` are
 * nullable in the spec (§6) and stay null until the person fills them in.
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
  /** "How do you like to travel?" (`extras.travelStyles`), up to 10. */
  travelStyles: TravelStyle[];
  /** "Where do you love to travel?" (`favouriteCities`, saved as `extras.favouriteCityIds`), up to 10. */
  favouriteCities: CityRef[];
  /** The city a trip of theirs covers today; read-only, as trips have no endpoints now (spec §2.8). */
  visiting: CityRef | null;
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
  verified: boolean;
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
  /** An empty list clears them. */
  travelStyles?: TravelStyle[];
  favouriteCityIds?: string[];
};

export type HandleAvailability =
  { available: true } | { available: false; reason: 'taken' | 'reserved' | 'format' };

/** A photo ready to upload: a local file and its type. */
export type ImageFile = { uri: string; name: string; type: string };
