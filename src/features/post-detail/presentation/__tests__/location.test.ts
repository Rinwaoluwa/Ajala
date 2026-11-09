import { describe, expect, it } from '@jest/globals';

import { locationLines, mapsUrl } from '../location';

const venue = {
  title: 'Jazz on the Terrace',
  placeName: 'Terra Kulture',
  placeId: 'demo-place-terra-kulture',
  formattedAddress: '1376 Tiamiyu Savage St, Victoria Island, Lagos, Nigeria',
  localityLabel: 'Lagos, Nigeria',
  lat: 6.43,
  lng: 3.42,
};
const pin = { ...venue, placeName: 'Bar Beach gate', placeId: null, formattedAddress: null };

describe('the post page location row', () => {
  it('names the place, with its address under it', () => {
    expect(locationLines(venue)).toEqual({ value: 'Terra Kulture', note: venue.formattedAddress });
  });

  it('puts the city under a dropped pin, which has no address', () => {
    expect(locationLines(pin)).toEqual({ value: 'Bar Beach gate', note: 'Lagos, Nigeria' });
  });

  it('never repeats a line, and has no row without a place', () => {
    const city = { ...pin, placeName: null };
    expect(locationLines(city)).toEqual({ value: 'Lagos, Nigeria', note: null });
    expect(locationLines({ ...city, localityLabel: null })).toBeNull();
  });

  it('opens the Google place on Android, and the pin in Apple Maps on iOS', () => {
    expect(mapsUrl(venue, 'android')).toBe(
      'https://www.google.com/maps/search/?api=1&query=Terra%20Kulture%2C%201376%20Tiamiyu%20Savage%20St%2C%20Victoria%20Island%2C%20Lagos%2C%20Nigeria&query_place_id=demo-place-terra-kulture',
    );
    expect(mapsUrl(venue, 'ios')).toMatch(/^http:\/\/maps\.apple\.com\/\?ll=6\.43,3\.42&q=Terra%20Kulture/);
    expect(mapsUrl(pin, 'android')).toMatch(/^geo:6\.43,3\.42\?q=6\.43,3\.42\(Bar%20Beach%20gate/);
  });
});
