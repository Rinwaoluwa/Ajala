import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Platform } from 'react-native';

import { googleAutocomplete, googlePlaceDetails } from '../googlePlaces';
import { ANDROID_CERT_SHA1, placesCredentials } from '../placesConfig';
import { PlacesError } from '../placesTypes';

// What app.config.js would have put in the manifest; each test sets its own `extra`.
const mockConfig: { expoConfig: Record<string, unknown> | null } = {
  expoConfig: null,
};
// A getter, because the hoisted factory runs before `mockConfig` is assigned.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return mockConfig.expoConfig;
    },
  },
}));

const fetchMock = jest.fn<(url: string, init?: RequestInit) => Promise<Response>>();

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function setPlatform(os: 'ios' | 'android') {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
}

function setExtra(extra: Record<string, unknown>) {
  mockConfig.expoConfig = {
    name: 'Ajala',
    slug: 'ajala',
    ios: { bundleIdentifier: 'com.ajala.app' },
    android: { package: 'com.ajala.app' },
    extra,
  };
}

const caught = (p: Promise<unknown>) =>
  p.then(
    () => null,
    (e: unknown) => e,
  );

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  setPlatform('ios');
  setExtra({ placesKey: { ios: 'ios-key', android: 'android-key' } });
});

describe('placesCredentials', () => {
  it('names the iOS app with its bundle id', () => {
    expect(placesCredentials()).toEqual({
      key: 'ios-key',
      headers: { 'X-Ios-Bundle-Identifier': 'com.ajala.app' },
    });
  });

  it('names the Android app with its package and signing SHA-1', () => {
    setPlatform('android');
    // Jest runs with __DEV__ on, so a development bundle sends the debug key's fingerprint.
    expect(placesCredentials()).toEqual({
      key: 'android-key',
      headers: {
        'X-Android-Package': 'com.ajala.app',
        'X-Android-Cert': ANDROID_CERT_SHA1.debug,
      },
    });
  });

  it('sends the configured SHA-1 instead, without colons', () => {
    setPlatform('android');
    setExtra({
      placesKey: { android: 'android-key' },
      placesAndroidCert: 'f3:4f:cf:95',
    });
    expect(placesCredentials()?.headers['X-Android-Cert']).toBe('F34FCF95');
  });

  it('ignores a configured SHA-1 that is not text, as builds carried `{}` (11 Nov)', () => {
    setPlatform('android');
    setExtra({ placesKey: { android: 'android-key' }, placesAndroidCert: {} });
    // Before the fix this threw, and every Android place search said "isn't available".
    expect(placesCredentials()?.headers['X-Android-Cert']).toBe(ANDROID_CERT_SHA1.debug);
  });

  it('is null without a key for this platform', () => {
    setExtra({ placesKey: { ios: null, android: 'android-key' } });
    expect(placesCredentials()).toBeNull();
  });
});

describe('googleAutocomplete', () => {
  it('asks for cities with the session token and a bias, and keeps place predictions only', async () => {
    fetchMock.mockResolvedValue(
      json(200, {
        suggestions: [
          {
            placePrediction: {
              placeId: 'ChIJ-lagos',
              text: { text: 'Lagos, Nigeria' },
              structuredFormat: {
                mainText: { text: 'Lagos' },
                secondaryText: { text: 'Nigeria' },
              },
            },
          },
          { queryPrediction: { text: { text: 'lagos restaurants' } } },
        ],
      }),
    );
    const result = await googleAutocomplete({
      text: 'Lag',
      citiesOnly: true,
      near: { lat: 6.4, lng: 3.4 },
      sessionToken: 'session-1',
    });
    expect(result).toEqual([{ placeId: 'ChIJ-lagos', primaryText: 'Lagos', secondaryText: 'Nigeria' }]);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://places.googleapis.com/v1/places:autocomplete');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({
      'X-Goog-Api-Key': 'ios-key',
      'X-Ios-Bundle-Identifier': 'com.ajala.app',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      input: 'Lag',
      includedPrimaryTypes: ['(cities)'],
      locationBias: {
        circle: { center: { latitude: 6.4, longitude: 3.4 }, radius: 50000 },
      },
      sessionToken: 'session-1',
    });
  });

  it('leaves the type filter and token out for an open, one-off search', async () => {
    fetchMock.mockResolvedValue(json(200, {}));
    await expect(
      googleAutocomplete({
        text: 'Terra',
        citiesOnly: false,
        sessionToken: null,
      }),
    ).resolves.toEqual([]);
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]?.body))).toEqual({
      input: 'Terra',
    });
  });

  it('says denied when Google refuses the key', async () => {
    fetchMock.mockResolvedValue(json(403, { error: { code: 403, status: 'PERMISSION_DENIED' } }));
    const e = await caught(googleAutocomplete({ text: 'Lag', citiesOnly: true, sessionToken: null }));
    expect(e).toBeInstanceOf(PlacesError);
    expect(e).toMatchObject({ kind: 'denied' });
  });

  it('says unavailable when Google is having a bad time', async () => {
    fetchMock.mockResolvedValue(json(503, { error: { status: 'UNAVAILABLE' } }));
    const e = await caught(googleAutocomplete({ text: 'Lag', citiesOnly: true, sessionToken: null }));
    expect(e).toMatchObject({ kind: 'unavailable' });
  });

  it('says network when the request never gets an answer', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    const e = await caught(googleAutocomplete({ text: 'Lag', citiesOnly: true, sessionToken: null }));
    expect(e).toMatchObject({ kind: 'network' });
  });

  it('says unavailable, without calling Google, when the build has no key', async () => {
    setExtra({});
    const e = await caught(googleAutocomplete({ text: 'Lag', citiesOnly: true, sessionToken: null }));
    expect(e).toMatchObject({ kind: 'unavailable' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('googlePlaceDetails', () => {
  it('asks for four fields with the session token, and reads them back', async () => {
    setPlatform('android');
    fetchMock.mockResolvedValue(
      json(200, {
        id: 'ChIJ-terra',
        displayName: { text: 'Terra Kulture', languageCode: 'en' },
        formattedAddress: 'Tiamiyu Savage St, Victoria Island, Lagos, Nigeria',
        location: { latitude: 6.4355, longitude: 3.4227 },
      }),
    );
    await expect(googlePlaceDetails('ChIJ-terra', 'session-1')).resolves.toEqual({
      placeId: 'ChIJ-terra',
      name: 'Terra Kulture',
      address: 'Tiamiyu Savage St, Victoria Island, Lagos, Nigeria',
      lat: 6.4355,
      lng: 3.4227,
    });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://places.googleapis.com/v1/places/ChIJ-terra?sessionToken=session-1');
    expect(init?.method).toBe('GET');
    expect(init?.headers).toMatchObject({
      'X-Goog-Api-Key': 'android-key',
      'X-Goog-FieldMask': 'id,displayName,formattedAddress,location',
      'X-Android-Package': 'com.ajala.app',
    });
  });

  it('says unavailable for a place with no location', async () => {
    fetchMock.mockResolvedValue(json(200, { id: 'x', displayName: { text: 'Somewhere' } }));
    await expect(caught(googlePlaceDetails('x', null))).resolves.toMatchObject({
      kind: 'unavailable',
    });
  });
});
