import { getAppConfig } from '@core/config/appConfig';

import type { SettingsRepository } from '../../domain/repositories/SettingsRepository';
import { cleanLinks, mergeExtras } from '../../domain/rules/settingsRules';
import { createSettingsApi, type SettingsRequest } from '../datasources/remote/settingsApi';
import {
  toAccount,
  toBlockedUser,
  toCity,
  toDraft,
  toSession,
  toSettings,
  toSettingsError,
  type ErrorContext,
} from '../mappers/settingsMappers';

/**
 * `SettingsRepository` over the API. Nothing is cached here; the screens' queries
 * cache. The app config comes from `core/config`, which caches it itself.
 */
export function createSettingsRepository(request: SettingsRequest): SettingsRepository {
  const api = createSettingsApi(request);
  const guard = async <T>(call: () => Promise<T>, context?: ErrorContext): Promise<T> => {
    try {
      return await call();
    } catch (e) {
      throw toSettingsError(e, context);
    }
  };

  return {
    getAccount: () => guard(async () => toAccount(await api.getMe())),
    updateAccount: (edit, current) =>
      guard(
        async () =>
          toAccount(
            await api.updateMe({
              ...(edit.firstName !== undefined ? { firstName: edit.firstName } : null),
              ...(edit.lastName !== undefined ? { lastName: edit.lastName } : null),
              ...(edit.handle !== undefined ? { handle: edit.handle } : null),
              ...(edit.bio !== undefined ? { bio: edit.bio } : null),
              ...(edit.homeCityId !== undefined ? { homeCityId: edit.homeCityId } : null),
              ...(edit.languages || edit.socialLinks
                ? {
                    extras: mergeExtras(current.extras, {
                      ...edit,
                      ...(edit.socialLinks ? { socialLinks: cleanLinks(edit.socialLinks) } : null),
                    }),
                  }
                : null),
            }),
          ),
        edit.handle !== undefined ? 'handle' : undefined,
      ),
    uploadAvatar: (file) => guard(async () => (await api.uploadAvatar(file)).avatarUrl ?? null),
    checkHandle: (handle) =>
      guard(async () => {
        const r = await api.checkHandle(handle);
        return { available: r.available, reason: r.reason ?? null };
      }),
    searchCities: (q, limit) => guard(async () => (await api.searchCities(q, limit)).map(toCity)),

    getSettings: () => guard(async () => toSettings(await api.getSettings())),
    updateSettings: (patch) => guard(async () => toSettings(await api.updateSettings(patch))),

    listSessions: () => guard(async () => (await api.listSessions()).map(toSession)),
    endSession: (sessionId) => guard(() => api.endSession(sessionId)),
    changePassword: (current, next) => guard(() => api.changePassword(current, next), 'password'),
    startEmailChange: (email) => guard(() => api.startEmailChange(email), 'emailChange'),
    confirmEmailChange: (code) => guard(() => api.confirmEmailChange(code), 'emailConfirm'),
    reauthenticate: (password) => guard(() => api.reauth(password), 'reauth'),
    deleteAccount: (reason) => guard(async () => (await api.deleteAccount(reason))?.purgeAt ?? null),

    listDrafts: () =>
      guard(async () => (await api.listDrafts()).items.filter((p) => p.status === 'draft').map(toDraft)),
    deleteDraft: (postId) => guard(() => api.deletePost(postId), 'deleteDraft'),

    listBlocked: () => guard(async () => (await api.listBlocked()).items.map(toBlockedUser)),
    unblock: (userId) => guard(() => api.unblock(userId)),

    getSupportLinks: () =>
      guard(async () => {
        const c = await getAppConfig();
        return {
          faqUrl: c.faqUrl,
          supportEmail: c.supportEmail,
          termsUrl: c.termsUrl,
          privacyUrl: c.privacyUrl,
        };
      }),
  };
}
