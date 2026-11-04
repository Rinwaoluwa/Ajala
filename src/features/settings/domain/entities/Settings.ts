/**
 * What the Settings screens read and change: the signed-in account (`GET /me`),
 * its stored preferences (`GET /me/settings`), its sessions, drafts and blocks
 * (spec §2.6, §2.14, §2.15, §6). Plain data; the data layer maps the API's
 * shapes onto these.
 */

export type PostType = 'meetup' | 'event' | 'plan' | 'group';

export type IdentityProvider = 'email' | 'google' | 'apple';

export type Identity = { provider: IdentityProvider; verifiedAt: string | null };

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
};

/** `UserSettingsDto`: the stored toggles the Settings screens show. */
export type UserSettings = {
  notifyJoinRequest: boolean;
  notifyRequestAccepted: boolean;
  notifyPostReminder: boolean;
  notifyNewMessage: boolean;
  notifyNewComment: boolean;
  notifySubscription: boolean;
  readReceipts: boolean;
  /** Out of search and suggestions; a direct link still works. */
  hiddenFromSearch: boolean;
  marketingEmails: boolean;
  dmPermission: 'anyone' | 'shared_only';
  /** Show an age band on the profile, never the date of birth. */
  showAge: boolean;
};

export type SettingsPatch = Partial<UserSettings>;

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
