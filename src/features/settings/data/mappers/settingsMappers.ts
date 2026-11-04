import { isApiError } from '@core/api/ApiError';

import type {
  Account,
  AccountCity,
  BlockedUser,
  Draft,
  Session,
  UserSettings,
} from '../../domain/entities/Settings';
import { SettingsError, type SettingsErrorCode } from '../../domain/entities/SettingsError';
import type {
  CityDto,
  MeDto,
  MyPostDto,
  PublicProfileDto,
  SessionDto,
  UserSettingsDto,
} from '../dto/settingsDtos';

export function toAccount(dto: MeDto): Account {
  const extras = dto.extras ?? {};
  const links = extras.socialLinks ?? {};
  return {
    id: dto.id,
    firstName: dto.firstName ?? '',
    lastName: dto.lastName ?? '',
    handle: dto.handle ?? null,
    email: dto.email ?? null,
    bio: dto.bio ?? null,
    avatarUrl: dto.avatarUrl ?? null,
    homeCity: dto.homeCity
      ? { id: dto.homeCity.id, name: dto.homeCity.name, label: dto.homeCity.label }
      : null,
    languages: Array.isArray(extras.languages) ? extras.languages : [],
    socialLinks: {
      instagram: links.instagram ?? null,
      tiktok: links.tiktok ?? null,
      website: links.website ?? null,
    },
    identities: (dto.identities ?? []).map((i) => ({
      provider: i.provider,
      verifiedAt: i.verifiedAt ?? null,
    })),
    extras,
  };
}

export const toCity = (dto: CityDto): AccountCity => ({
  id: dto.id,
  name: dto.name,
  label: dto.label || dto.name,
});

export function toSettings(dto: UserSettingsDto): UserSettings {
  return {
    notifyJoinRequest: dto.notifyJoinRequest,
    notifyRequestAccepted: dto.notifyRequestAccepted,
    notifyPostReminder: dto.notifyPostReminder,
    notifyNewMessage: dto.notifyNewMessage,
    notifyNewComment: dto.notifyNewComment,
    notifySubscription: dto.notifySubscription,
    readReceipts: dto.readReceipts,
    hiddenFromSearch: dto.hiddenFromSearch,
    marketingEmails: dto.marketingEmails,
    dmPermission: dto.dmPermission,
    showAge: dto.showAge,
  };
}

export const toSession = (dto: SessionDto): Session => ({
  id: dto.id,
  deviceName: dto.deviceName ?? null,
  country: dto.country ?? null,
  startedAt: dto.startedAt,
  lastUsedAt: dto.lastUsedAt,
  current: !!dto.current,
});

export const toDraft = (dto: MyPostDto): Draft => ({
  id: dto.id,
  type: dto.type,
  title: dto.title,
  updatedAt: dto.updatedAt,
});

export const toBlockedUser = (dto: PublicProfileDto): BlockedUser => ({
  id: dto.id,
  displayName: dto.displayName,
  handle: dto.handle ?? null,
  avatarUrl: dto.avatarUrl ?? null,
});

/** Which call failed: the same status means different things to different calls. */
export type ErrorContext = 'password' | 'reauth' | 'emailChange' | 'emailConfirm' | 'handle' | 'deleteDraft';

/** By the API's code (spec §5), never its message. */
export function toSettingsError(e: unknown, context?: ErrorContext): SettingsError {
  if (e instanceof SettingsError) return e;
  if (!isApiError(e)) {
    // Auth's session wrapper turns a 401 into its own "session expired" after one
    // refresh. On these calls a 401 is the person's password or code, not the
    // session — a session that really ended signs the person out by itself.
    const code = (e as { code?: unknown } | null)?.code;
    if (code === 'sessionExpired') {
      if (context === 'password' || context === 'reauth') return new SettingsError('wrongPassword');
      if (context === 'emailConfirm') return new SettingsError('badCode');
      return new SettingsError('sessionExpired');
    }
    return new SettingsError('unknown');
  }

  const byCode: Partial<Record<string, SettingsErrorCode>> = {
    REAUTH_REQUIRED: 'reauthRequired',
    PASSWORD_BREACHED: 'passwordBreached',
    HANDLE_COOLDOWN: 'handleCooldown',
    POST_HAS_ATTENDEES: 'hasAttendees',
    PAYLOAD_TOO_LARGE: 'imageTooLarge',
    UNSUPPORTED_MEDIA_TYPE: 'imageNotSupported',
    NOT_FOUND: 'notFound',
    RATE_LIMITED: 'rateLimited',
    NETWORK: 'network',
    TIMEOUT: 'network',
  };
  let code = byCode[e.code];
  if (!code && e.code === 'UNAUTHORIZED') {
    code =
      context === 'password' || context === 'reauth'
        ? 'wrongPassword'
        : context === 'emailConfirm'
          ? 'badCode'
          : 'sessionExpired';
  }
  if (!code && e.code === 'CONFLICT') {
    code =
      context === 'handle'
        ? 'handleTaken'
        : context === 'emailChange' || context === 'emailConfirm'
          ? 'emailTaken'
          : context === 'deleteDraft'
            ? 'hasAttendees'
            : 'unknown';
  }
  if (!code && (e.code === 'VALIDATION_FAILED' || e.code === 'BAD_REQUEST')) code = 'invalidDetails';

  const availableAt = typeof e.details?.availableAt === 'string' ? e.details.availableAt : null;
  return new SettingsError(code ?? 'unknown', { message: e.message, availableAt });
}
