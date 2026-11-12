import * as Crypto from 'expo-crypto';
import * as Location from 'expo-location';

import { googleAutocomplete, googleCityNear, googlePlaceDetails } from './googlePlaces';
import {
  PlacesError,
  type CityRef,
  type LatLng,
  type PlaceDetails,
  type PlaceSuggestion,
} from './placesTypes';

/**
 * Finding places for the API, which takes Google place ids and has no place
 * search of its own (spec §1.6). Features call these plain functions; nothing
 * here knows about screens or caches.
 */

// ---------- the typing session ----------

/**
 * Google bills autocomplete per session, not per keystroke, when every request
 * of one search carries the same token and the Place Details call that ends it
 * does too. One picker is open at a time, so one session at a time is enough.
 * A session left idle is dropped: Google ends them after a few minutes anyway,
 * and reusing a stale token only bills the old way.
 */
const SESSION_IDLE_MS = 3 * 60 * 1000;
let session: { token: string; lastUsed: number } | null = null;

function sessionToken(): string {
  const now = Date.now();
  if (!session || now - session.lastUsed > SESSION_IDLE_MS) {
    session = { token: Crypto.randomUUID(), lastUsed: now };
  } else {
    session.lastUsed = now;
  }
  return session.token;
}

/**
 * Ends the current search session. `placeDetails` does it itself; call this
 * when a picker closes having taken a suggestion as it was (a home city needs
 * only the id and name), so the next search starts a new session.
 */
export function endPlacesSession(): void {
  session = null;
}

// ---------- search ----------

/**
 * Cities matching what was typed, for the home place, favourite destinations
 * and teleport. Blank text answers [] without asking anyone.
 */
export async function searchCities(
  text: string,
  near?: LatLng | null,
  signal?: AbortSignal,
  within?: { center: LatLng; radiusM: number } | null,
): Promise<PlaceSuggestion[]> {
  const query = text.trim();
  if (!query) return [];
  return googleAutocomplete({
    text: query,
    citiesOnly: true,
    near,
    within,
    sessionToken: sessionToken(),
    signal,
  });
}

/**
 * Countries, regions and cities matching what was typed, for favourite
 * destinations: someone loves Qatar or Bali, not only Doha or Denpasar. The
 * API stores any Google place id there. Blank text answers [].
 */
export async function searchDestinations(text: string, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
  const query = text.trim();
  if (!query) return [];
  return googleAutocomplete({
    text: query,
    citiesOnly: false,
    regions: true,
    sessionToken: sessionToken(),
    signal,
  });
}

/**
 * A free member's own area, for what they post (MOB-077): the server refuses a
 * post outside it ("Posting outside your area needs a subscription"), so their
 * search only offers places within this distance of the phone. 50 km is the
 * most Google takes, and about a city.
 */
export const OWN_AREA_RADIUS_M = 50_000;

/**
 * Any place matching what was typed (venues, neighbourhoods, cities), for a
 * post's place. `near` ranks places around that point first; `within` offers
 * only places inside the circle (a free member's own area).
 */
export async function searchPlaces(
  text: string,
  near?: LatLng | null,
  signal?: AbortSignal,
  within?: { center: LatLng; radiusM: number } | null,
): Promise<PlaceSuggestion[]> {
  const query = text.trim();
  if (!query) return [];
  return googleAutocomplete({
    text: query,
    citiesOnly: false,
    near,
    within,
    sessionToken: sessionToken(),
    signal,
  });
}

/** A picked place's name, address and coordinates. Ends the search session. */
export async function placeDetails(placeId: string, signal?: AbortSignal): Promise<PlaceDetails> {
  const token = session?.token ?? null;
  endPlacesSession();
  return googlePlaceDetails(placeId, token, signal);
}

// ---------- detect my city ----------

/**
 * The city at a point, for "detect my city".
 *
 * Google's Nearby Search names the nearest city (`locality`) within 30 km from
 * the point alone. Where it finds none (out in the country) the phone's own
 * geocoder names the area, and a cities-only search for that name, biased to
 * the point, gives its place id. Nearby Search comes first because many Android
 * phones have no geocoder, and those that do often name a district, not a city.
 *
 * Not Google's Geocoding web service: the keys are restricted to the app, and
 * Geocoding does not take app-restricted keys.
 *
 * Null when neither finds a city there. Throws a PlacesError when Google cannot
 * be reached and the geocoder has no answer either.
 */
export async function cityAt(lat: number, lng: number): Promise<CityRef | null> {
  let googleFailure: unknown = null;
  try {
    const near = await googleCityNear({ lat, lng });
    if (near?.name) return near;
  } catch (e) {
    googleFailure = e;
  }

  // The places module reads the geocoder itself rather than through
  // src/core/location, which only resolves typed text to a point.
  let address: Location.LocationGeocodedAddress | undefined;
  try {
    [address] = await Location.reverseGeocodeAsync({
      latitude: lat,
      longitude: lng,
    });
  } catch {
    if (googleFailure) throw googleFailure;
    throw new PlacesError('unavailable', 'The phone could not name this place.');
  }
  // Some places have no "city" (a district or county is as close as it gets).
  const name = address?.city ?? address?.subregion ?? address?.region;
  if (!name) {
    if (googleFailure) throw googleFailure;
    return null;
  }

  const query = [name, address?.country].filter(Boolean).join(', ');
  // A one-off lookup with no pick to follow, so no session token.
  const [first] = await googleAutocomplete({
    text: query,
    citiesOnly: true,
    near: { lat, lng },
    sessionToken: null,
  });
  return first ? { placeId: first.placeId, name: first.primaryText } : null;
}
