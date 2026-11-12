import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { getCurrentCoordinates } from '@core/location/deviceLocation';
import { OWN_AREA_RADIUS_M, PlacesError, placeDetails, searchCities, searchPlaces } from '@core/places';

import { googlePlaceFinder } from '../datasources/native/placeFinder';

jest.mock('@core/places', () => {
  const actual = jest.requireActual<typeof import('@core/places')>('@core/places');
  return {
    ...actual,
    searchCities: jest.fn(),
    searchPlaces: jest.fn(),
    placeDetails: jest.fn(),
    endPlacesSession: jest.fn(),
  };
});

jest.mock('@core/location/deviceLocation', () => ({ getCurrentCoordinates: jest.fn() }));
const here = jest.mocked(getCurrentCoordinates);

const places = {
  searchCities: jest.mocked(searchCities),
  searchPlaces: jest.mocked(searchPlaces),
  placeDetails: jest.mocked(placeDetails),
};

describe('the place finder over @core/places', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('searches cities or any place, passing the area and the signal on', async () => {
    places.searchCities.mockResolvedValue([{ placeId: 'g-ams', primaryText: 'Amsterdam', secondaryText: 'Netherlands' }]);
    const signal = new AbortController().signal;
    expect(await googlePlaceFinder.search('cities', 'Ams', null, signal)).toEqual([
      { placeId: 'g-ams', name: 'Amsterdam', detail: 'Netherlands' },
    ]);
    expect(places.searchCities).toHaveBeenCalledWith('Ams', null, signal, null);
    places.searchPlaces.mockResolvedValue([]);
    await googlePlaceFinder.search('places', 'Terra', { lat: 6.4, lng: 3.4 });
    expect(places.searchPlaces).toHaveBeenCalledWith('Terra', { lat: 6.4, lng: 3.4 }, undefined, null);
    // Pro (or not limited): the phone is never asked.
    expect(here).not.toHaveBeenCalled();
  });

  it('keeps a free member to places around the phone (MOB-077)', async () => {
    here.mockResolvedValue({ lat: 51.507, lng: -0.128 });
    places.searchPlaces.mockResolvedValue([]);
    await googlePlaceFinder.search('places', 'Pub', null, undefined, true);
    expect(places.searchPlaces).toHaveBeenCalledWith('Pub', null, undefined, {
      center: { lat: 51.507, lng: -0.128 },
      radiusM: OWN_AREA_RADIUS_M,
    });
    // No fix: the search stays open, and the server says so on publish.
    here.mockResolvedValue(null);
    await googlePlaceFinder.search('places', 'Pub', null, undefined, true);
    expect(places.searchPlaces).toHaveBeenLastCalledWith('Pub', null, undefined, null);
  });

  it('turns a picked place into the draft’s terms', async () => {
    places.placeDetails.mockResolvedValue({ placeId: 'g', name: 'Terra Kulture', address: 'VI, Lagos', lat: 6.4, lng: 3.4 });
    expect(await googlePlaceFinder.details('g')).toEqual({
      placeId: 'g',
      name: 'Terra Kulture',
      address: 'VI, Lagos',
      coords: { lat: 6.4, lng: 3.4 },
    });
  });

  it('reads every places failure as "search isn’t available", and lets a cancel through', async () => {
    places.searchPlaces.mockRejectedValue(new PlacesError('denied', 'no'));
    await expect(googlePlaceFinder.search('places', 'Terra', null)).rejects.toMatchObject({
      code: 'placesUnavailable',
    });
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    places.placeDetails.mockRejectedValue(abort);
    await expect(googlePlaceFinder.details('g')).rejects.toBe(abort);
  });
});
