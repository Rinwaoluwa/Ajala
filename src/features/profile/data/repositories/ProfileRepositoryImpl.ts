import { getCurrentCoordinates, getLocationPermission } from '@core/location/deviceLocation';

import type { City, MyProfile, ProfileUpdate } from '../../domain/entities/Profile';
import type { ProfileRepository } from '../../domain/repositories/ProfileRepository';
import { createProfileApi, type ProfileRequest } from '../datasources/remote/profileApi';
import type { ProfileExtrasDto, UpdateProfileDto } from '../dto/profileDtos';
import { toCity, toInterest, toMyProfile, toProfileError } from '../mappers/profileMappers';

/**
 * `ProfileRepository` over the API and the phone's location.
 *
 * Extras: `PATCH /me` takes `extras` as one record. Languages live inside it,
 * beside fields this app does not edit yet (pronouns, tagline, social links), so
 * a languages change is merged into the extras the profile already has rather
 * than replacing them. The last `GET /me` (or PATCH answer) is kept for that.
 *
 * Cache policy: interests are fetched once per repository (the setup flow);
 * they are a short server-ordered list that changes rarely. Nothing else is cached.
 */
export function createProfileRepository(request: ProfileRequest): ProfileRepository {
  const api = createProfileApi(request);
  let extras: ProfileExtrasDto | null = null;
  let interests: ReturnType<typeof toInterest>[] | null = null;

  const remember = (me: Awaited<ReturnType<typeof api.getMe>>): MyProfile => {
    extras = me.extras ?? {};
    return toMyProfile(me);
  };

  async function currentExtras(): Promise<ProfileExtrasDto> {
    if (extras) return extras;
    remember(await api.getMe());
    return extras ?? {};
  }

  return {
    async getMyProfile() {
      try {
        return remember(await api.getMe());
      } catch (e) {
        throw toProfileError(e);
      }
    },

    async updateProfile(update: ProfileUpdate) {
      try {
        const body: UpdateProfileDto = {
          firstName: update.firstName,
          lastName: update.lastName,
          dob: update.dateOfBirth,
          gender: update.gender,
          handle: update.handle,
          homeCityId: update.homeCityId,
          interestIds: update.interestIds,
        };
        if (update.languages)
          body.extras = {
            ...(await currentExtras()),
            languages: update.languages,
          };
        // Leave out what is not being changed: the API treats a sent null as "clear".
        const sent = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined));
        return remember(await api.updateMe(sent));
      } catch (e) {
        throw toProfileError(e, { handle: update.handle !== undefined });
      }
    },

    async uploadAvatar(file) {
      try {
        return (await api.uploadAvatar(file)).avatarUrl;
      } catch (e) {
        throw toProfileError(e);
      }
    },

    async removeAvatar() {
      try {
        await api.removeAvatar();
      } catch (e) {
        throw toProfileError(e);
      }
    },

    async detectHomeCity(): Promise<City | null> {
      if ((await getLocationPermission()) !== 'granted') return null;
      const coords = await getCurrentCoordinates();
      if (!coords) return null;
      try {
        return toCity((await api.resolveCity(coords.lat, coords.lng)).city);
      } catch {
        // No city near enough, or no answer: the person picks one instead.
        return null;
      }
    },

    async searchCities(query, limit) {
      try {
        return (await api.searchCities(query, limit)).map(toCity);
      } catch (e) {
        throw toProfileError(e);
      }
    },

    async listInterests() {
      if (interests) return interests;
      try {
        interests = (await api.listInterests()).map(toInterest);
        return interests;
      } catch (e) {
        throw toProfileError(e);
      }
    },

    async checkHandle(handle) {
      try {
        const answer = await api.checkHandle(handle);
        if (answer.available) return { available: true };
        return { available: false, reason: answer.reason ?? 'taken' };
      } catch (e) {
        throw toProfileError(e, { handle: true });
      }
    },
  };
}
