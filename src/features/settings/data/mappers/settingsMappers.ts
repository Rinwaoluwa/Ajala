import { isApiError } from '@core/api/ApiError';

import type {
  Account,
  AccountCity,
  BlockedUser,
  DataExport,
  Draft,
  MyReport,
  Session,
  UserSettings,
} from '../../domain/entities/Settings';
import { SettingsError, type SettingsErrorCode } from '../../domain/entities/SettingsError';
import { isTravelStyle } from '../../domain/rules/travelStyles';
import type {
  CityDto,
  CityRefDto,
  DataExportDto,
  MeDto,
  MyPostDto,
  MyReportDto,
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
    homeCity: dto.homeCity ? toCityRef(dto.homeCity) : null,
    languages: Array.isArray(extras.languages) ? extras.languages : [],
    socialLinks: {
      instagram: links.instagram ?? null,
      tiktok: links.tiktok ?? null,
      website: links.website ?? null,
    },
    // A slug outside the API's fixed list could not be saved back, so it is dropped here.
    travelStyles: Array.isArray(extras.travelStyles) ? extras.travelStyles.filter(isTravelStyle) : [],
    favouriteCities: (dto.favouriteCities ?? []).map(toCityRef),
    identities: (dto.identities ?? []).map((i) => ({ provider: i.provider })),
    extras,
  };
}

const toCityRef = (dto: CityRefDto): AccountCity => ({
  id: dto.id,
  name: dto.name,
  label: dto.label || dto.name,
});

export const toCity = (dto: CityDto): AccountCity => toCityRef(dto);

export function toSettings(dto: UserSettingsDto): UserSettings {
  return {
    notifyJoinRequest: dto.notifyJoinRequest,
    notifyRequestAccepted: dto.notifyRequestAccepted,
    notifyPostReminder: dto.notifyPostReminder,
    notifyNewMessage: dto.notifyNewMessage,
    notifyNewComment: dto.notifyNewComment,
    notifySubscription: dto.notifySubscription,
    readReceipts: dto.readReceipts,
    dmPermission: dto.dmPermission === 'shared_only' ? 'shared_only' : 'anyone',
    hiddenFromSearch: dto.hiddenFromSearch,
    analyticsOptOut: dto.analyticsOptOut,
    showCurrentCity: dto.showCurrentCity,
    openToMeetToday: dto.openToMeetToday,
    sharePlans: dto.sharePlans,
  };
}

export const toReport = (dto: MyReportDto): MyReport => ({
  id: dto.id,
  targetType: dto.targetType,
  reason: dto.reason,
  status: dto.status,
  createdAt: dto.createdAt,
  resolvedAt: dto.resolvedAt ?? null,
});

export const toDataExport = (dto: DataExportDto): DataExport => ({
  id: dto.id,
  status: dto.status,
  requestedAt: dto.requestedAt,
  readyAt: dto.readyAt ?? null,
  expiresAt: dto.expiresAt ?? null,
  downloadUrl: dto.downloadUrl ?? null,
});

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
export type ErrorContext =
  | 'password'
  | 'reauth'
  | 'reauthCode'
  | 'setPassword'
  | 'emailChange'
  | 'emailConfirm'
  | 'handle'
  | 'deleteDraft'
  | 'export';

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
      if (context === 'emailConfirm' || context === 'reauthCode') return new SettingsError('badCode');
      return new SettingsError('sessionExpired');
    }
    return new SettingsError('unknown');
  }

  const byCode: Partial<Record<string, SettingsErrorCode>> = {
    REAUTH_REQUIRED: 'reauthRequired',
    PASSWORD_BREACHED: 'passwordBreached',
    HANDLE_COOLDOWN: 'handleCooldown',
    LAST_SIGN_IN_METHOD: 'lastSignInMethod',
    EMAIL_NOT_VERIFIED: 'emailNotVerified',
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
        : context === 'emailConfirm' || context === 'reauthCode'
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
            : context === 'setPassword'
              ? 'alreadyHasPassword'
              : context === 'export'
                ? 'exportTooSoon'
                : 'unknown';
  }
  if (!code && (e.code === 'VALIDATION_FAILED' || e.code === 'BAD_REQUEST')) code = 'invalidDetails';

  // No longer documented with HANDLE_COOLDOWN; used only when the server still sends it.
  const availableAt = typeof e.details?.availableAt === 'string' ? e.details.availableAt : null;
  return new SettingsError(code ?? 'unknown', { message: e.message, availableAt });
}
