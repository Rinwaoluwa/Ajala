import { describe, expect, it } from '@jest/globals';

import { emptyDraft, type PostDraft } from '../entities/PostDraft';
import {
  canLeaveStep,
  firstIncompleteStep,
  isHttpsUrl,
  move,
  parseWhole,
  perPersonAmount,
  priceCentsOf,
  stepCapacity,
  stepIssues,
  toIsoWithOffset,
  toSubmission,
  toggleInterest,
} from '../rules/postDraftRules';

const NOW = new Date(2026, 9, 20, 12, 0);
const photo = (n: number) => ({
  key: `p${n}`,
  uri: `file:///p${n}.jpg`,
  name: `p${n}.jpg`,
  type: 'image/jpeg' as const,
});

function ready(kind: PostDraft['kind'] = 'meetup'): PostDraft {
  return {
    ...emptyDraft(kind),
    photos: [photo(1), photo(2)],
    title: 'Black American Cultural Celebration',
    description: 'Soul food, jazz and community.',
    city:
      kind === 'plan' || kind === 'group'
        ? { id: 'ams', name: 'Amsterdam', label: 'Amsterdam, Netherlands', lat: 52.37, lng: 4.9 }
        : null,
    date: new Date(2026, 9, 22),
    startTime: new Date(2026, 0, 1, 17, 30),
    place: 'Lekki, Lagos',
    placeCoords: { lat: 6.44, lng: 3.47 },
    capacity: kind === 'event' ? null : 10,
    interestIds: ['food'],
  };
}

describe('the steps', () => {
  it('needs 2 photos, a title and a description to leave the first step', () => {
    const draft = { ...ready(), photos: [photo(1)], title: ' ', description: '' };
    expect(stepIssues(draft, 'basics', NOW)).toEqual({
      photos: 'tooFewPhotos',
      title: 'required',
      description: 'required',
    });
  });

  it('asks a Plan or Group for its city, and not a Meetup', () => {
    expect(stepIssues({ ...ready('plan'), city: null }, 'basics', NOW)).toEqual({ city: 'required' });
    expect(canLeaveStep(ready('meetup'), 'basics', NOW)).toBe(true);
  });

  it('refuses a start in the past and an end before the start', () => {
    const past = { ...ready(), date: new Date(2026, 9, 20), startTime: new Date(2026, 0, 1, 9, 0) };
    expect(stepIssues(past, 'schedule', NOW).startTime).toBe('inPast');
    const backwards = { ...ready('event'), endTime: new Date(2026, 0, 1, 16, 0) };
    expect(stepIssues(backwards, 'schedule', NOW).endTime).toBe('endBeforeStart');
  });

  it('needs a meeting point for a Meetup or Event, not for a Plan', () => {
    expect(stepIssues({ ...ready('event'), place: '' }, 'schedule', NOW).place).toBe('required');
    expect(stepIssues({ ...ready('plan'), place: '' }, 'schedule', NOW).place).toBeUndefined();
  });

  it('holds a paid Event until it has an https link', () => {
    const paid = { ...ready('event'), costOn: true, amount: '5000' };
    expect(stepIssues(paid, 'cost', NOW).externalUrl).toBe('required');
    expect(stepIssues({ ...paid, externalUrl: 'http://tix.example.com' }, 'cost', NOW).externalUrl).toBe(
      'notHttps',
    );
    expect(canLeaveStep({ ...paid, externalUrl: 'https://tix.example.com/a' }, 'cost', NOW)).toBe(true);
  });

  it('needs 1 to 3 interests to publish', () => {
    expect(stepIssues({ ...ready(), interestIds: [] }, 'review', NOW).interests).toBe('interestCount');
    expect(firstIncompleteStep(ready(), NOW)).toBeNull();
    expect(firstIncompleteStep({ ...ready(), title: '' }, NOW)).toBe('basics');
  });
});

describe('capacity', () => {
  it('takes an Event from no limit to 101 and back', () => {
    expect(stepCapacity('event', null, 1)).toBe(101);
    expect(stepCapacity('event', 101, -1)).toBeNull();
    expect(stepCapacity('event', null, -1)).toBeNull();
  });

  it('keeps a Group within 1 to 100 and a Meetup at 1 or more', () => {
    expect(stepCapacity('group', 100, 1)).toBe(100);
    expect(stepCapacity('group', 1, -1)).toBe(1);
    expect(stepCapacity('meetup', 1, -1)).toBe(1);
    expect(stepIssues({ ...ready('event'), capacity: 50 }, 'participants', NOW).capacity).toBe(
      'capacityRange',
    );
  });
});

describe('money', () => {
  it('reads whole amounts, with or without separators', () => {
    expect(parseWhole('60,000')).toBe(60000);
    expect(parseWhole('0')).toBeNull();
    expect(parseWhole('12.5')).toBeNull();
  });

  it('splits a shared total between the expected travellers, rounding up', () => {
    const draft = { ...ready(), costOn: true, amount: '60000', expected: '4' };
    expect(perPersonAmount(draft)).toBe(15000);
    expect(priceCentsOf(draft)).toBe(1_500_000);
    expect(perPersonAmount({ ...draft, amount: '100', expected: '3' })).toBe(34);
  });

  it('takes an Event amount as already per person', () => {
    expect(priceCentsOf({ ...ready('event'), costOn: true, amount: '5000' })).toBe(500_000);
  });
});

describe('what is sent', () => {
  it('builds the form, leaving blank fields out', () => {
    const s = toSubmission({ ...ready(), costOn: true, amount: '60000', expected: '4' });
    expect(s).toMatchObject({
      type: 'meetup',
      title: 'Black American Cultural Celebration',
      lat: 6.44,
      lng: 3.47,
      placeName: 'Lekki, Lagos',
      capacity: 10,
      priceCents: 1_500_000,
      currency: 'NGN',
      visibility: 'private',
      showOnMap: true,
      interestIds: ['food'],
    });
    expect(s.startAt).toMatch(/^2026-10-22T17:30:00[+-]\d{2}:\d{2}$/);
    expect(s).not.toHaveProperty('checklist');
    expect(s).not.toHaveProperty('externalUrl');
  });

  it("uses a Plan's city as its pin without a meeting point, and sends its lines as the checklist", () => {
    const plan = {
      ...ready('plan'),
      place: '',
      placeCoords: null,
      notes: [
        { key: 'a', text: 'Day 1 · Arrival + dinner' },
        { key: 'b', text: '  ' },
      ],
    };
    expect(toSubmission(plan)).toMatchObject({
      lat: 52.37,
      lng: 4.9,
      placeName: 'Amsterdam, Netherlands',
      checklist: ['Day 1 · Arrival + dinner'],
    });
  });

  it('sends no price while the cost is off, whatever was typed', () => {
    expect(toSubmission({ ...ready(), costOn: false, amount: '500' })).not.toHaveProperty('priceCents');
  });

  it("writes the phone's offset into the start", () => {
    const iso = toIsoWithOffset(new Date(2026, 9, 22, 18, 0));
    expect(iso.slice(0, 19)).toBe('2026-10-22T18:00:00');
    expect(iso).toMatch(/[+-]\d{2}:\d{2}$/);
  });
});

describe('helpers', () => {
  it('moves an item as a drag does', () => {
    expect(move(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
    expect(move(['a', 'b'], 0, 5)).toEqual(['a', 'b']);
  });

  it('caps interests at three', () => {
    expect(toggleInterest(['a', 'b', 'c'], 'd')).toEqual(['a', 'b', 'c']);
    expect(toggleInterest(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('accepts only https links', () => {
    expect(isHttpsUrl('https://tix.ng/e/1')).toBe(true);
    expect(isHttpsUrl('http://tix.ng')).toBe(false);
    expect(isHttpsUrl('tix.ng')).toBe(false);
  });
});
