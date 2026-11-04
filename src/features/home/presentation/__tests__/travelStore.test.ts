import { beforeEach, describe, expect, it } from '@jest/globals';

import { travelStore } from '../state/travelStore';

const LAGOS = { id: 'lagos', name: 'Lagos', countryCode: 'NG' };
const LONDON = { id: 'london', name: 'London', countryCode: 'GB' };
const PARIS = { id: 'paris', name: 'Paris', countryCode: 'FR' };

describe('travelling', () => {
  beforeEach(() => {
    travelStore.reset();
    travelStore.setHome(LAGOS);
  });

  it('points the feed at a city and remembers it, newest first', () => {
    travelStore.travelTo(LONDON);
    travelStore.travelTo(PARIS);
    travelStore.travelTo(LONDON);

    expect(travelStore.get().destination?.name).toBe('London');
    expect(travelStore.get().recent.map((c) => c.name)).toEqual(['London', 'Paris']);
  });

  it('comes home when the home city is picked', () => {
    travelStore.travelTo(LONDON);
    travelStore.travelTo(LAGOS);
    expect(travelStore.get().destination).toBeNull();
  });

  it('forgets everything on reset (sign-out)', () => {
    travelStore.travelTo(LONDON);
    travelStore.reset();
    expect(travelStore.get()).toEqual({ destination: null, home: null, recent: [] });
  });
});
