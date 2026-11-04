/**
 * Wire shapes Settings reads and sends (spec §6), trimmed to what the screens
 * use. Fields the spec marks non-nullable but describes as possibly empty are
 * typed nullable (spec §6 note).
 */

export interface CityRefDto {
  id: string;
  name: string;
  countryCode: string;
  label: string;
}

export interface CityDto extends CityRefDto {
  region: string;
  countryName: string;
}

export interface SocialLinksDto {
  instagram?: string | null;
  tiktok?: string | null;
  website?: string | null;
}

export interface MeDto {
  id: string;
  firstName: string | null;
  lastName: string | null;
  handle: string | null;
  email: string | null;
  bio: string | null;
  avatarUrl: string | null;
  homeCity: CityRefDto | null;
  extras: (Record<string, unknown> & { languages?: string[]; socialLinks?: SocialLinksDto }) | null;
  identities: { provider: 'email' | 'google' | 'apple'; verifiedAt: string | null }[] | null;
}

export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  handle?: string;
  bio?: string | null;
  homeCityId?: string | null;
  extras?: Record<string, unknown>;
}

export interface UserSettingsDto {
  notifyJoinRequest: boolean;
  notifyRequestAccepted: boolean;
  notifyPostReminder: boolean;
  notifyNewMessage: boolean;
  notifyNewComment: boolean;
  notifySubscription: boolean;
  readReceipts: boolean;
  hiddenFromSearch: boolean;
  analyticsOptOut: boolean;
  marketingEmails: boolean;
  dmPermission: 'anyone' | 'shared_only';
  showAge: boolean;
  marketingEmailsChangedAt: string | null;
}

export interface SessionDto {
  id: string;
  deviceName: string | null;
  ip: string | null;
  country: string | null;
  startedAt: string;
  lastUsedAt: string;
  current: boolean;
}

export interface MyPostDto {
  id: string;
  type: 'meetup' | 'event' | 'plan' | 'group';
  title: string;
  status: 'draft' | 'published' | 'taken_down' | 'cancelled';
  updatedAt: string;
}

export interface PublicProfileDto {
  id: string;
  handle: string | null;
  displayName: string;
  avatarUrl: string | null;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface HandleAvailabilityDto {
  available: boolean;
  reason?: 'taken' | 'reserved' | 'format' | null;
}

export interface DeletionScheduledDto {
  purgeAt: string | null;
}
