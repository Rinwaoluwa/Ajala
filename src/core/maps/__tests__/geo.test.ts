import { describe, expect, it } from '@jest/globals';

import { MAX_BBOX_SPAN, bboxParam, regionAround, regionToBbox } from '../geo';

describe('regionToBbox', () => {
  it('covers the visible region', () => {
    expect(regionToBbox({ latitude: 6.5, longitude: 3.4, latitudeDelta: 0.2, longitudeDelta: 0.1 })).toEqual({
      west: 3.35,
      south: 6.4,
      east: 3.45,
      north: 6.6,
    });
  });

  it('shrinks a zoomed-out view around its centre to under the API limit', () => {
    const box = regionToBbox({ latitude: 0, longitude: 0, latitudeDelta: 40, longitudeDelta: 60 });
    expect(box.north - box.south).toBeLessThan(5);
    expect(box.east - box.west).toBeLessThan(5);
    expect(box.north - box.south).toBeCloseTo(MAX_BBOX_SPAN, 3);
    expect(box.north + box.south).toBeCloseTo(0, 6);
  });

  it('stays on the globe', () => {
    const box = regionToBbox({ latitude: 89, longitude: 179, latitudeDelta: 4, longitudeDelta: 4 });
    expect(box.north).toBe(90);
    expect(box.east).toBe(180);
  });

  it('formats as west,south,east,north', () => {
    expect(bboxParam({ west: 1, south: 2, east: 3, north: 4 })).toBe('1,2,3,4');
  });
});

describe('regionAround', () => {
  it('centres a city-sized view', () => {
    expect(regionAround(6.5, 3.4)).toEqual({
      latitude: 6.5,
      longitude: 3.4,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    });
  });
});
