/**
 * What the Settings screens read and change: the signed-in account (`GET /me`),
 * its stored preferences (`GET /me/settings`), its sessions, drafts, blocks,
 * reports and data export (spec §2.6, §2.14, §2.15, §6). Plain data; the data
 * layer maps the API's shapes onto these.
 */

export type PostType = 'meetup' | 'event' | 'plan' | 'group';

export type IdentityProvider = 'email' | 'google' | 'apple';

/** A way to sign in. The API sends the provider only (`verifiedAt` was dropped, spec §8). */
export type Identity = { provider: IdentityProvider };

/** The providers that can be unlinked (`DELETE /me/identities/{provider}`); email cannot. */
export type LinkedProvider = Exclude<IdentityProvider, 'email'>;

/** The fixed list `extras.travelStyles` takes (spec §6 `TravelStyle`). */
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

export type SocialLinks = { instagram: string | null; tiktok: string | null; website: string | null };

export type AccountCity = { id: string; name: string; label: string };

export type Account = {
  id: string;
  firstName: string;
  lastName: string;
  handle: string | null;
  email: string | null;
  bio: string | null;
  avatarUrl: string | null;
  homeCity: AccountCity | null;
  /** ISO 639-1 codes, in the person's order. */
  languages: string[];
  socialLinks: SocialLinks;
  /** Up to 10, in the person's order. */
  travelStyles: TravelStyle[];
  /** Up to 10 cities (`MeDto.favouriteCities`, sent back as `extras.favouriteCityIds`). */
  favouriteCities: AccountCity[];
  identities: Identity[];
  /**
   * Every extras field as the server last sent it. `PATCH /me` replaces extras
   * as one record, so an edit is merged into this rather than sent alone.
   */
  extras: Record<string, unknown>;
};

/** A change to the profile; fields left out are left alone (`PATCH /me`). */
export type ProfileEdit = {
  firstName?: string;
  lastName?: string;
  handle?: string;
  bio?: string | null;
  homeCityId?: string | null;
  languages?: string[];
  socialLinks?: SocialLinks;
  travelStyles?: TravelStyle[];
  favouriteCityIds?: string[];
};

/** `UserSettingsDto`: the stored switches the Settings screens show. */
export type UserSettings = {
  notifyJoinRequest: boolean;
  notifyRequestAccepted: boolean;
  notifyPostReminder: boolean;
  notifyNewMessage: boolean;
  notifyNewComment: boolean;
  notifySubscription: boolean;
  readReceipts: boolean;
  /** Who can start a direct chat: anyone, or only people the person shares a post with. */
  dmPermission: 'anyone' | 'shared_only';
  /** Out of search and suggestions; a direct link still works. */
  hiddenFromSearch: boolean;
  /** Read here, but changed only through `PATCH /me/analytics` (not part of the settings patch). */
  analyticsOptOut: boolean;
  /** Show the home city, or the city a trip covers today, on the profile. */
  showCurrentCity: boolean;
  /** Shown on the profile; the server switches it off at the person's midnight. */
  openToMeetToday: boolean;
  /** List the upcoming open posts the person is going to on their public profile. */
  sharePlans: boolean;
};

/** `PATCH /me/settings`: only what changed. Analytics has its own call, so it is left out. */
export type SettingsPatch = Partial<Omit<UserSettings, 'analyticsOptOut'>>;

/** A signed-in device (`GET /me/sessions`). */
export type Session = {
  id: string;
  deviceName: string | null;
  /** Approximate two-letter country of the last sign-in. */
  country: string | null;
  startedAt: string;
  lastUsedAt: string;
  /** The phone making the request. */
  current: boolean;
};

/** An unpublished post (`GET /me/posts?status=draft`). */
export type Draft = {
  id: string;
  type: PostType;
  title: string;
  updatedAt: string;
};

/** Someone the person blocked (`GET /me/blocks`). */
export type BlockedUser = {
  id: string;
  displayName: string;
  handle: string | null;
  avatarUrl: string | null;
};

export type HandleCheck = { available: boolean; reason: 'taken' | 'reserved' | 'format' | null };

/** Where Help & support and About send people (`GET /app/config`). */
export type SupportLinks = {
  faqUrl: string;
  supportEmail: string;
  termsUrl: string;
  privacyUrl: string;
};

/** Something the person reported (`GET /me/reports`). The text they wrote is not returned. */
export type MyReport = {
  id: string;
  targetType: 'user' | 'post' | 'comment' | 'message';
  reason: 'harassment' | 'impersonation' | 'spam' | 'inappropriate_content' | 'other';
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
  resolvedAt: string | null;
};

export type ReportsPage = { items: MyReport[]; nextCursor: string | null };

/** A copy of the person's data (`POST/GET /me/export`). */
export type DataExport = {
  id: string;
  status: 'queued' | 'ready' | 'failed';
  requestedAt: string;
  readyAt: string | null;
  expiresAt: string | null;
  /** Signed and good for 24 hours; null while it is being built or once it has expired. */
  downloadUrl: string | null;
};

/** What "Confirm it's you" sends (`POST /me/reauth`): the password, or a code emailed for it. */
export type ReauthProof = { password: string } | { code: string };
