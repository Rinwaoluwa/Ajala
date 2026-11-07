import { beforeEach, describe, expect, it } from '@jest/globals';

import { travelChoice } from '../../domain/rules/travelRules';
import { travelMemory } from '../state/travelMemory';

const LAGOS = { id: 'lagos', name: 'Lagos', countryCode: 'NG' };
const LONDON = { id: 'london', name: 'London', countryCode: 'GB' };
const PARIS = { id: 'paris', name: 'Paris', countryCode: 'FR' };

describe('travel memory', () => {
  beforeEach(() => {
    travelMemory.reset();
    travelMemory.setHome(LAGOS);
  });

  it('keeps recent teleports newest first, each once', () => {
    travelMemory.addRecent(LONDON);
    travelMemory.addRecent(PARIS);
    travelMemory.addRecent(LONDON);
    expect(travelMemory.get().recent.map((c) => c.name)).toEqual(['London', 'Paris']);
  });

  it('forgets everything on reset (sign-out)', () => {
    travelMemory.addRecent(LONDON);
    travelMemory.reset();
    expect(travelMemory.get()).toEqual({ home: null, recent: [] });
  });
});

describe('choosing a city', () => {
  it('closes for the city the feed is already in', () => {
    expect(travelChoice(LAGOS, { name: 'lagos', countryCode: 'NG' }, LAGOS, true)).toEqual({ kind: 'stay' });
  });

  it('teleports a subscriber, and sends everyone else to the paywall', () => {
    expect(travelChoice(LONDON, LAGOS, LAGOS, true)).toEqual({ kind: 'teleport', cityId: 'london' });
    expect(travelChoice(LONDON, LAGOS, LAGOS, false)).toEqual({ kind: 'paywall' });
  });

  it('comes home from a teleport, subscribed or not', () => {
    expect(travelChoice(LAGOS, LONDON, LAGOS, true)).toEqual({ kind: 'returnHome' });
    expect(travelChoice(LAGOS, LONDON, LAGOS, false)).toEqual({ kind: 'returnHome' });
  });
});
