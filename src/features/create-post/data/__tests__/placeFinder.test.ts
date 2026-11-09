import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { PlacesError, placeDetails, searchCities, searchPlaces } from '@core/places';

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
    expect(places.searchCities).toHaveBeenCalledWith('Ams', null, signal);
    places.searchPlaces.mockResolvedValue([]);
    await googlePlaceFinder.search('places', 'Terra', { lat: 6.4, lng: 3.4 });
    expect(places.searchPlaces).toHaveBeenCalledWith('Terra', { lat: 6.4, lng: 3.4 }, undefined);
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
