import { placesCredentials } from './placesConfig';
import { PlacesError, type LatLng, type PlaceDetails, type PlaceSuggestion } from './placesTypes';

/**
 * Google Places API (New) over plain fetch: Autocomplete, Place Details and
 * Nearby Search (the city a point is in).
 *
 * Plain HTTP rather than a native Places SDK so it needs no native module and
 * no new build, and so the same code runs on both platforms. The API itself
 * has no place search (spec §1.6): the app finds the place, the API is sent its id.
 *
 * Docs: https://developers.google.com/maps/documentation/places/web-service/place-autocomplete
 * and .../place-details.
 */

const BASE_URL = 'https://places.googleapis.com/v1';
const TIMEOUT_MS = 8000;

/**
 * How far around a point to prefer results, in metres. 50 km is the most a
 * circle may be; a bias only ranks results, it never hides a far-away match.
 */
const BIAS_RADIUS_M = 50_000;

/** Only the fields we read: Google bills Place Details by the fields asked for. */
const DETAILS_FIELD_MASK = 'id,displayName,formattedAddress,location';

type AutocompleteResponse = {
  suggestions?: {
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
    };
  }[];
};

type NearbyResponse = {
  places?: { id?: string; displayName?: { text?: string } }[];
};

/** How far from the phone a city may be and still count as "the city you are in", in metres. */
const CITY_RADIUS_M = 30_000;

type DetailsResponse = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
};

function credentialsOrThrow() {
  const credentials = placesCredentials();
  if (!credentials) throw new PlacesError('unavailable', 'This build has no Places key.');
  return credentials;
}

/**
 * One request to Google with the key, the app headers and a time limit.
 * Every failure becomes a PlacesError, except the caller cancelling, which is
 * passed on as it is so TanStack Query can tell a cancel from a failure.
 */
async function googleRequest<T>(
  path: string,
  init: {
    method: 'GET' | 'POST';
    body?: unknown;
    fieldMask?: string;
    signal?: AbortSignal;
  },
): Promise<T> {
  const { key, headers } = credentialsOrThrow();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onCallerAbort = () => controller.abort();
  init.signal?.addEventListener('abort', onCallerAbort);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: init.method,
      headers: {
        ...headers,
        'X-Goog-Api-Key': key,
        ...(init.fieldMask ? { 'X-Goog-FieldMask': init.fieldMask } : null),
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : null),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    if (init.signal?.aborted) throw e;
    throw new PlacesError('network', 'Could not reach Google Places.');
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener('abort', onCallerAbort);
  }

  if (!response.ok) {
    // 401/403 is the key: Places API (New) not enabled on it, or the app
    // restriction headers don't match. Anything else is Google having a bad time
    // (429 quota, 5xx) or an id it doesn't know (400/404).
    const kind = response.status === 401 || response.status === 403 ? 'denied' : 'unavailable';
    const detail = await response
      .json()
      .then((b: { error?: { status?: string; message?: string } }) => b.error?.status ?? b.error?.message)
      .catch(() => undefined);
    throw new PlacesError(kind, `Google Places answered ${response.status}${detail ? ` (${detail})` : ''}.`);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new PlacesError('unavailable', 'Google Places sent something unreadable.');
  }
}

export type AutocompleteInput = {
  text: string;
  /** Cities only: Google's "(cities)" type collection. */
  citiesOnly: boolean;
  near?: LatLng | null;
  /** Ties the keystrokes and the pick into one billed session; null for a one-off lookup. */
  sessionToken: string | null;
  signal?: AbortSignal;
};

export async function googleAutocomplete(input: AutocompleteInput): Promise<PlaceSuggestion[]> {
  const body = {
    input: input.text,
    ...(input.citiesOnly ? { includedPrimaryTypes: ['(cities)'] } : null),
    ...(input.near
      ? {
          locationBias: {
            circle: {
              center: { latitude: input.near.lat, longitude: input.near.lng },
              radius: BIAS_RADIUS_M,
            },
          },
        }
      : null),
    ...(input.sessionToken ? { sessionToken: input.sessionToken } : null),
  };
  const answer = await googleRequest<AutocompleteResponse>('/places:autocomplete', {
    method: 'POST',
    body,
    signal: input.signal,
  });
  // Query predictions ("pizza near…") have no place id and can't be picked, so they are left out.
  return (answer.suggestions ?? []).flatMap(({ placePrediction: p }) => {
    if (!p?.placeId) return [];
    const primary = p.structuredFormat?.mainText?.text ?? p.text?.text ?? '';
    return [
      {
        placeId: p.placeId,
        primaryText: primary,
        secondaryText: p.structuredFormat?.secondaryText?.text ?? '',
      },
    ];
  });
}

export async function googlePlaceDetails(
  placeId: string,
  sessionToken: string | null,
  signal?: AbortSignal,
): Promise<PlaceDetails> {
  const query = sessionToken ? `?sessionToken=${encodeURIComponent(sessionToken)}` : '';
  const answer = await googleRequest<DetailsResponse>(`/places/${encodeURIComponent(placeId)}${query}`, {
    method: 'GET',
    fieldMask: DETAILS_FIELD_MASK,
    signal,
  });
  const lat = answer.location?.latitude;
  const lng = answer.location?.longitude;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw new PlacesError('unavailable', 'Google Places gave no location for this place.');
  }
  return {
    placeId: answer.id ?? placeId,
    name: answer.displayName?.text ?? '',
    address: answer.formattedAddress ?? '',
    lat,
    lng,
  };
}

/**
 * The nearest city (Google's `locality`) to a point, or null when none is
 * within 30 km. Google names it from the point alone, so it does not depend on
 * the phone's geocoder, which many Android phones lack.
 */
export async function googleCityNear(point: LatLng, signal?: AbortSignal): Promise<{ placeId: string; name: string } | null> {
  const answer = await googleRequest<NearbyResponse>('/places:searchNearby', {
    method: 'POST',
    fieldMask: 'places.id,places.displayName',
    body: {
      includedPrimaryTypes: ['locality'],
      maxResultCount: 1,
      rankPreference: 'DISTANCE',
      locationRestriction: {
        circle: { center: { latitude: point.lat, longitude: point.lng }, radius: CITY_RADIUS_M },
      },
    },
    signal,
  });
  const first = answer.places?.[0];
  return first?.id ? { placeId: first.id, name: first.displayName?.text ?? '' } : null;
}
