import { getClientLocationHeader } from '@core/location/deviceLocation';

import type { ProfileViewRepository } from '../../domain/repositories/ProfileViewRepository';
import type { ProfileRequest } from '../datasources/remote/profileApi';
import { createProfileViewApi } from '../datasources/remote/profileViewApi';
import { toProfileError } from '../mappers/profileMappers';
import { toActivityPage, toPublicProfile } from '../mappers/profileViewMappers';

/**
 * `ProfileViewRepository` over the API. Errors about another person are mapped
 * with `person` (404 → not available, 409 → already reported, 400 → own
 * profile). Nothing is cached here; the screens' queries do that.
 */
export function createProfileViewRepository(request: ProfileRequest): ProfileViewRepository {
  const api = createProfileViewApi(request);
  const guard = async <T>(call: () => Promise<T>, person = false): Promise<T> => {
    try {
      return await call();
    } catch (e) {
      throw toProfileError(e, { person });
    }
  };
  const location = async () => (await getClientLocationHeader()) ?? undefined;

  return {
    getMyAttended: (cursor, limit) =>
      guard(async () => toActivityPage(await api.getMyAttended(cursor, limit, await location()))),
    getMySaved: (filter, cursor, limit) =>
      guard(async () => toActivityPage(await api.getMySaved(filter, cursor, limit, await location()))),
    getMyRsvps: (state, cursor, limit) =>
      guard(async () => toActivityPage(await api.getMyRsvps(state, cursor, limit, await location()))),
    getPerson: (userId) => guard(async () => toPublicProfile(await api.getPerson(userId)), true),
    getPersonPosts: (userId, cursor, limit) =>
      guard(
        async () => toActivityPage(await api.getPersonPosts(userId, cursor, limit, await location())),
        true,
      ),
    getPersonAttended: (userId, cursor, limit) =>
      guard(
        async () => toActivityPage(await api.getPersonAttended(userId, cursor, limit, await location())),
        true,
      ),
    getPersonPlans: (userId, cursor, limit) =>
      guard(
        async () => toActivityPage(await api.getPersonPlans(userId, cursor, limit, await location())),
        true,
      ),
    block: (userId) => guard(() => api.block(userId), true),
    unblock: (userId) => guard(() => api.unblock(userId), true),
    report: (userId, reason, details) =>
      guard(async () => void (await api.report(userId, details ? { reason, details } : { reason })), true),
  };
}
