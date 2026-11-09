import {
  getCurrentCoordinates,
  getLocationPermission,
  requestLocationPermission,
} from '@core/location/deviceLocation';
import { cityAt, endPlacesSession, searchCities } from '@core/places';

import type { CityDetection, MyProfile, ProfileUpdate } from '../../domain/entities/Profile';
import type { ProfileRepository } from '../../domain/repositories/ProfileRepository';
import { createProfileApi, type ProfileRequest } from '../datasources/remote/profileApi';
import type { ProfileExtrasDto, UpdateProfileDto } from '../dto/profileDtos';
import {
  toCitySuggestion,
  toFoundCity,
  toInterest,
  toMyProfile,
  toProfileError,
} from '../mappers/profileMappers';

/**
 * `ProfileRepository` over the API, the phone's location and Google places.
 *
 * Extras: `PATCH /me` takes `extras` as one record. Languages, travel styles and
 * favourite destinations live inside it, beside fields setup does not edit
 * (pronouns, tagline, social links), so a change is merged into the extras the
 * profile already has rather than replacing them. The last `GET /me` (or PATCH
 * answer) is kept for that. Favourite destinations come back as
 * `favouriteDestinations`, not always inside `extras`, so their ids are carried
 * over from there: otherwise a languages-only change could send extras without
 * them and clear them.
 *
 * Old extras keys are dropped before sending: `PATCH /me` rejects fields it does
 * not list, so a `favouriteCityIds` left over from before the move to places
 * would fail every save.
 *
 * Cities: the API has no city search (spec §1.6), so search and "detect my
 * city" go to `@core/places`, and only the chosen place ids reach the API.
 *
 * Cache policy: interests are fetched once per repository (the setup flow);
 * they are a short server-ordered list that changes rarely. City searches are
 * cached by the screen's query. Nothing else is cached.
 */
export function createProfileRepository(request: ProfileRequest): ProfileRepository {
  const api = createProfileApi(request);
  let extras: ProfileExtrasDto | null = null;
  let interests: ReturnType<typeof toInterest>[] | null = null;

  const remember = (me: Awaited<ReturnType<typeof api.getMe>>): MyProfile => {
    const known: ProfileExtrasDto = { ...(me.extras ?? {}) };
    delete known.favouriteCityIds;
    extras =
      known.favouriteDestinationIds || !me.favouriteDestinations?.length
        ? known
        : { ...known, favouriteDestinationIds: me.favouriteDestinations.map((c) => c.placeId) };
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
          homePlaceId: update.homePlaceId,
          interestIds: update.interestIds,
          timezone: update.timezone,
        };
        const changed: ProfileExtrasDto = {};
        if (update.languages) changed.languages = update.languages;
        if (update.travelStyles) changed.travelStyles = update.travelStyles;
        if (update.favouriteDestinationIds) changed.favouriteDestinationIds = update.favouriteDestinationIds;
        if (Object.keys(changed).length) body.extras = { ...(await currentExtras()), ...changed };
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

    async detectHomeCity(): Promise<CityDetection> {
      let permission = await getLocationPermission();
      if (permission === 'undetermined' || permission === 'deniedCanAsk') {
        permission = await requestLocationPermission();
      }
      if (permission !== 'granted') return { kind: 'noPermission', blocked: permission === 'blocked' };
      const coords = await getCurrentCoordinates();
      if (!coords) return { kind: 'notFound' };
      try {
        const found = await cityAt(coords.lat, coords.lng);
        return found ? { kind: 'found', city: toFoundCity(found) } : { kind: 'notFound' };
      } catch {
        // Google could not be reached and the phone's geocoder had nothing: worth another try.
        return { kind: 'notFound' };
      }
    },

    async searchCities(query, signal) {
      try {
        return (await searchCities(query, null, signal)).map(toCitySuggestion);
      } catch (e) {
        // A cancelled search (the person typed on) is not a failure; hand the abort back as it was.
        if (signal?.aborted) throw e;
        throw toProfileError(e);
      }
    },

    endCitySearch() {
      endPlacesSession();
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
