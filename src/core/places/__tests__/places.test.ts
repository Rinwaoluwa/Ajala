import { describe, expect, it, jest } from '@jest/globals';
import * as Location from 'expo-location';

jest.mock('expo-crypto', () => {
  let n = 0;
  return { randomUUID: () => `token-${++n}` };
});
jest.mock('expo-location', () => ({ reverseGeocodeAsync: jest.fn() }));
jest.mock('../googlePlaces', () => ({
  googleAutocomplete: jest.fn(async () => [
    { placeId: 'ChIJ-lagos', primaryText: 'Lagos', secondaryText: 'Nigeria' },
  ]),
  googleCityNear: jest.fn(async () => null),
  googlePlaceDetails: jest.fn(async (placeId: unknown) => ({
    placeId,
    name: 'X',
    address: '',
    lat: 0,
    lng: 0,
  })),
}));

type PlacesModule = typeof import('../places');
type GoogleModule = jest.Mocked<typeof import('../googlePlaces')>;

/** A fresh copy of the module, so each test starts with no search session. */
function load(): { places: PlacesModule; google: GoogleModule } {
  let places!: PlacesModule;
  let google!: GoogleModule;
  // A fresh copy needs a synchronous require inside isolateModules.
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    places = require('../places') as PlacesModule;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    google = require('../googlePlaces') as GoogleModule;
  });
  return { places, google };
}

const reverseGeocode = jest.mocked(Location.reverseGeocodeAsync);

describe('places against Google', () => {
  it('keeps one session token across a search, and the pick ends it', async () => {
    const { places, google } = load();
    await places.searchCities('La');
    await places.searchCities('Lag');
    await places.placeDetails('ChIJ-lagos');
    await places.searchPlaces('Ter');

    const tokens = google.googleAutocomplete.mock.calls.map(([input]) => input.sessionToken);
    expect(tokens[0]).toBe(tokens[1]);
    expect(google.googlePlaceDetails.mock.calls[0]?.[1]).toBe(tokens[0]);
    expect(tokens[2]).not.toBe(tokens[0]);
    expect(google.googleAutocomplete.mock.calls.map(([input]) => input.citiesOnly)).toEqual([
      true,
      true,
      false,
    ]);
  });

  it('asks nobody about blank text', async () => {
    const { places, google } = load();
    await expect(places.searchPlaces('   ')).resolves.toEqual([]);
    expect(google.googleAutocomplete).not.toHaveBeenCalled();
  });

  it('detects the city with Google from the point alone, without the geocoder', async () => {
    const { places, google } = load();
    google.googleCityNear.mockResolvedValueOnce({ placeId: 'ChIJ-accra', name: 'Accra' });
    await expect(places.cityAt(5.6, -0.19)).resolves.toEqual({ placeId: 'ChIJ-accra', name: 'Accra' });
    expect(google.googleCityNear).toHaveBeenCalledWith({ lat: 5.6, lng: -0.19 });
    expect(reverseGeocode).not.toHaveBeenCalled();
  });

  it('falls back to the geocoded name, biased to the point, with no session', async () => {
    const { places, google } = load();
    reverseGeocode.mockResolvedValue([
      {
        city: 'Lagos',
        region: 'Lagos',
        country: 'Nigeria',
      } as Location.LocationGeocodedAddress,
    ]);
    await expect(places.cityAt(6.43, 3.42)).resolves.toEqual({
      placeId: 'ChIJ-lagos',
      name: 'Lagos',
    });
    expect(google.googleAutocomplete).toHaveBeenCalledWith({
      text: 'Lagos, Nigeria',
      citiesOnly: true,
      near: { lat: 6.43, lng: 3.42 },
      sessionToken: null,
    });
  });

  it('finds no city where the geocoder names none, and fails when it cannot answer', async () => {
    const { places } = load();
    reverseGeocode.mockResolvedValue([{} as Location.LocationGeocodedAddress]);
    await expect(places.cityAt(0, 0)).resolves.toBeNull();
    reverseGeocode.mockRejectedValue(new Error('geocoder down'));
    await expect(places.cityAt(0, 0)).rejects.toMatchObject({
      kind: 'unavailable',
    });
  });

  it("passes Google's failure on when the geocoder has nothing either", async () => {
    const { places, google } = load();
    const { PlacesError } = jest.requireActual<typeof import('../placesTypes')>('../placesTypes');
    google.googleCityNear.mockRejectedValueOnce(new PlacesError('network', 'offline'));
    reverseGeocode.mockResolvedValue([{} as Location.LocationGeocodedAddress]);
    await expect(places.cityAt(1, 1)).rejects.toMatchObject({ kind: 'network' });
  });
});
