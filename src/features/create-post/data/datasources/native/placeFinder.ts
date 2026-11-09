import {
  endPlacesSession,
  isPlacesError,
  placeDetails,
  searchCities,
  searchPlaces,
} from '@core/places';

import { CreatePostError } from '../../../domain/entities/CreatePostError';
import type { PlaceFinder } from '../../../domain/repositories/PostRepository';

/**
 * The pickers' Google place search, through `@core/places` (the API has no
 * search of its own, spec §1.6). In demo mode it answers from the built-in
 * places, whose ids the demo API accepts.
 *
 * Every places failure (no key, Google down, offline) reads the same to the
 * host — "Place search isn't available right now" — so they all become one
 * code. A cancelled request is passed through untouched for the caller to drop.
 */
const asCreatePostError = (e: unknown): unknown =>
  isPlacesError(e) ? new CreatePostError('placesUnavailable', { message: e.message }) : e;

export const googlePlaceFinder: PlaceFinder = {
  async search(kind, text, near, signal) {
    try {
      const found = await (kind === 'cities' ? searchCities : searchPlaces)(text, near, signal);
      return found.map((s) => ({ placeId: s.placeId, name: s.primaryText, detail: s.secondaryText }));
    } catch (e) {
      throw asCreatePostError(e);
    }
  },
  async details(placeId, signal) {
    try {
      const d = await placeDetails(placeId, signal);
      return { placeId: d.placeId, name: d.name, address: d.address, coords: { lat: d.lat, lng: d.lng } };
    } catch (e) {
      throw asCreatePostError(e);
    }
  },
  endSession: endPlacesSession,
};
