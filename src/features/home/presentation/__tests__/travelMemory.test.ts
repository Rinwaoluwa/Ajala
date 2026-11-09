import { beforeEach, describe, expect, it } from '@jest/globals';

import { MAX_RECENT_TRAVELS, shortPlaceName, travelChoice } from '../../domain/rules/travelRules';
import { travelMemory } from '../state/travelMemory';

const city = (slug: string, name: string) => ({ placeId: `g-${slug}`, name, detail: '' });
const LONDON = city('london', 'London');
const PARIS = city('paris', 'Paris');

const NOT_TELEPORTED = { teleported: false, placeId: null };
const IN_LONDON = { teleported: true, placeId: 'g-london' };

describe('travel memory', () => {
  beforeEach(() => travelMemory.reset());

  it('keeps recent teleports newest first, each once, up to the limit', () => {
    travelMemory.addRecent(LONDON);
    travelMemory.addRecent(PARIS);
    travelMemory.addRecent(LONDON);
    expect(travelMemory.get().recent.map((c) => c.name)).toEqual(['London', 'Paris']);
    for (let i = 0; i < 10; i++) travelMemory.addRecent(city(`c${i}`, `City ${i}`));
    expect(travelMemory.get().recent).toHaveLength(MAX_RECENT_TRAVELS);
  });

  it('remembers the phone’s region, ignoring an unnamed one', () => {
    travelMemory.setHere('Lagos');
    travelMemory.setHere(null);
    expect(travelMemory.get().here).toBe('Lagos');
  });

  it('forgets everything on reset (sign-out)', () => {
    travelMemory.addRecent(LONDON);
    travelMemory.setHere('Lagos');
    travelMemory.reset();
    expect(travelMemory.get()).toEqual({ here: null, recent: [] });
  });
});

describe('choosing a place', () => {
  it('closes for where the feed already is', () => {
    expect(travelChoice({ kind: 'here' }, NOT_TELEPORTED, true)).toEqual({ kind: 'stay' });
    expect(travelChoice({ kind: 'city', placeId: 'g-london' }, IN_LONDON, true)).toEqual({ kind: 'stay' });
  });

  it('teleports a subscriber by place id, and sends everyone else to the paywall', () => {
    expect(travelChoice({ kind: 'city', placeId: 'g-paris' }, NOT_TELEPORTED, true)).toEqual({
      kind: 'teleport',
      placeId: 'g-paris',
    });
    expect(travelChoice({ kind: 'city', placeId: 'g-paris' }, IN_LONDON, false)).toEqual({ kind: 'paywall' });
  });

  it('comes home from a teleport, subscribed or not, even before GET /me names it', () => {
    expect(travelChoice({ kind: 'here' }, IN_LONDON, true)).toEqual({ kind: 'returnHome' });
    expect(travelChoice({ kind: 'here' }, { teleported: true, placeId: null }, false)).toEqual({
      kind: 'returnHome',
    });
  });

  it('shortens a place label for the header', () => {
    expect(shortPlaceName('Accra, Ghana')).toBe('Accra');
    expect(shortPlaceName('Lagos')).toBe('Lagos');
  });
});
