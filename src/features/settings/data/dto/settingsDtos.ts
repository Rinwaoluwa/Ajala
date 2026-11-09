/**
 * Wire shapes Settings reads and sends (spec §6), trimmed to what the screens
 * use. Fields the spec marks non-nullable but describes as possibly empty are
 * typed nullable (spec §6 note).
 */

/** A place the API holds by its Google place id (spec §1.6); there is no city catalogue any more. */
export interface PlaceRefDto {
  placeId: string;
  /** "Lagos, Nigeria". */
  label: string;
  countryCode: string | null;
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
  homePlace: PlaceRefDto | null;
  extras:
    | (Record<string, unknown> & {
        languages?: string[];
        socialLinks?: SocialLinksDto;
        travelStyles?: string[] | null;
        favouriteDestinationIds?: string[];
      })
    | null;
  /** The cities behind `extras.favouriteDestinationIds`, in order. */
  favouriteDestinations: PlaceRefDto[] | null;
  /** Provider only: `verifiedAt` left the API (spec §8). */
  identities: { provider: 'email' | 'google' | 'apple' }[] | null;
}

export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  handle?: string;
  bio?: string | null;
  /** A city's Google place id; a venue or street address is a 400. */
  homePlaceId?: string | null;
  extras?: Record<string, unknown>;
}

export interface UserSettingsDto {
  notifyJoinRequest: boolean;
  notifyRequestAccepted: boolean;
  notifyPostReminder: boolean;
  notifyNewComment: boolean;
  notifyNewMessage: boolean;
  notifySubscription: boolean;
  /** Activity near the person. On by default; only stored for now — nothing sends it yet (backend answers C5). */
  notifyNearbyActivity: boolean;
  /** Suggestions from their interests. Off by default; only stored for now (C5). */
  notifyRecommendations: boolean;
  readReceipts: boolean;
  dmPermission: 'anyone' | 'shared_only';
  hiddenFromSearch: boolean;
  analyticsOptOut: boolean;
  showCurrentCity: boolean;
  openToMeetToday: boolean;
  /** Public: list the person's upcoming open activities on their profile. Not the trusted person (C6). */
  sharePlans: boolean;
}

/** Only the changed fields. Analytics is not in it: it has `PATCH /me/analytics`. */
export type UpdateUserSettingsDto = Partial<Omit<UserSettingsDto, 'analyticsOptOut'>>;

export interface AnalyticsOptDto {
  /** False stops usage analytics. */
  enabled: boolean;
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

export interface ReauthDto {
  password?: string;
  code?: string;
}

export interface MyReportDto {
  id: string;
  targetType: 'user' | 'post' | 'comment' | 'message';
  targetId: string;
  reason: 'harassment' | 'impersonation' | 'spam' | 'inappropriate_content' | 'other';
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
  resolvedAt: string | null;
}

export interface DataExportDto {
  id: string;
  status: 'queued' | 'ready' | 'failed';
  requestedAt: string;
  readyAt: string | null;
  expiresAt: string | null;
  downloadUrl: string | null;
}
