import { getAppConfig } from '@core/config/appConfig';
import {
  getCurrentCoordinates,
  getLocationPermission,
  requestLocationPermission,
} from '@core/location/deviceLocation';
import { cityAt, endPlacesSession, searchCities } from '@core/places';

import type { SettingsRepository } from '../../domain/repositories/SettingsRepository';
import { cleanLinks, editsExtras, mergeExtras } from '../../domain/rules/settingsRules';
import { createSettingsApi, type SettingsRequest } from '../datasources/remote/settingsApi';
import {
  toAccount,
  toBlockedUser,
  toCitySuggestion,
  toDataExport,
  toDraft,
  toInterest,
  toProfilePhoto,
  toReport,
  toSession,
  toSettings,
  toSettingsError,
  type ErrorContext,
} from '../mappers/settingsMappers';

/**
 * `SettingsRepository` over the API, and Google places for the city search (the
 * API has none, spec §1.6). Nothing is cached here; the screens' queries
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
              ...(edit.homePlaceId !== undefined ? { homePlaceId: edit.homePlaceId } : null),
              ...(edit.interestIds !== undefined ? { interestIds: edit.interestIds } : null),
              ...(editsExtras(edit)
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
    addPhoto: (file) => guard(async () => toProfilePhoto(await api.addPhoto(file)), 'photo'),
    removePhoto: (photoId) => guard(() => api.removePhoto(photoId)),
    reorderPhotos: (ids) => guard(async () => (await api.reorderPhotos({ ids })).map(toProfilePhoto)),
    listInterests: () => guard(async () => (await api.listInterests()).map(toInterest)),
    checkHandle: (handle) =>
      guard(async () => {
        const r = await api.checkHandle(handle);
        return { available: r.available, reason: r.reason ?? null };
      }),
    searchCities: async (q, signal) => {
      try {
        return (await searchCities(q, null, signal)).map(toCitySuggestion);
      } catch (e) {
        // A cancelled search (the person typed on) is not a failure; hand the abort back as it was.
        if (signal?.aborted) throw e;
        throw toSettingsError(e);
      }
    },
    endCitySearch: () => endPlacesSession(),
    detectCurrentCity: async () => {
      let permission = await getLocationPermission();
      if (permission === 'undetermined' || permission === 'deniedCanAsk') {
        permission = await requestLocationPermission();
      }
      if (permission !== 'granted') return null;
      const coords = await getCurrentCoordinates();
      if (!coords) return null;
      try {
        const found = await cityAt(coords.lat, coords.lng);
        return found ? { placeId: found.placeId, name: found.name, label: found.name } : null;
      } catch {
        return null;
      }
    },

    getSettings: () => guard(async () => toSettings(await api.getSettings())),
    updateSettings: (patch) => guard(async () => toSettings(await api.updateSettings(patch))),
    setAnalytics: (enabled) => guard(async () => toSettings(await api.setAnalytics({ enabled }))),

    listSessions: () => guard(async () => (await api.listSessions()).map(toSession)),
    endSession: (sessionId) => guard(() => api.endSession(sessionId)),
    signOutEverywhere: () => guard(() => api.logoutAll()),
    changePassword: (current, next) => guard(() => api.changePassword(current, next), 'password'),
    setPassword: (next) => guard(() => api.setPassword(next), 'setPassword'),
    startEmailChange: (email) => guard(() => api.startEmailChange(email), 'emailChange'),
    confirmEmailChange: (code) => guard(() => api.confirmEmailChange(code), 'emailConfirm'),
    sendReauthCode: () => guard(() => api.sendReauthCode()),
    reauthenticate: (proof) =>
      'code' in proof
        ? guard(() => api.reauth({ code: proof.code }), 'reauthCode')
        : guard(() => api.reauth({ password: proof.password }), 'reauth'),
    unlinkIdentity: (provider) => guard(() => api.unlinkIdentity(provider)),
    deleteAccount: (reason) => guard(async () => (await api.deleteAccount(reason))?.purgeAt ?? null),

    requestExport: () => guard(async () => toDataExport(await api.requestExport()), 'export'),
    getExport: () =>
      guard(async () => {
        try {
          return toDataExport(await api.getExport());
        } catch (e) {
          // 404 is "never asked for", an ordinary state rather than a failure.
          const mapped = toSettingsError(e, 'export');
          if (mapped.code === 'notFound') return null;
          throw mapped;
        }
      }),

    listReports: (cursor) =>
      guard(async () => {
        const page = await api.listReports(cursor);
        return { items: page.items.map(toReport), nextCursor: page.nextCursor ?? null };
      }),

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
