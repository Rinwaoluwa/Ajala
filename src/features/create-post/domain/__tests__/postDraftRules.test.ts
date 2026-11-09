import { describe, expect, it } from '@jest/globals';

import { emptyDraft, type PostDraft } from '../entities/PostDraft';
import {
  canLeaveStep,
  firstIncompleteStep,
  isHttpsUrl,
  move,
  parseWhole,
  priceCentsOf,
  stepOfField,
  stepsFor,
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
    destination:
      kind === 'plan' || kind === 'group'
        ? { placeId: 'g-ams', name: 'Amsterdam', address: 'Amsterdam, Netherlands', coords: { lat: 52.37, lng: 4.9 } }
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

  it('asks a Plan or Group for its destination, and not a Meetup', () => {
    expect(stepIssues({ ...ready('plan'), destination: null }, 'basics', NOW)).toEqual({
      destination: 'required',
    });
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
    expect(stepIssues({ ...ready('plan'), place: '' }, 'schedule', NOW).place).toBeUndefined();
  });

  it('lets a paid Event go on without a link, and holds only a link that is not https', () => {
    const paid = { ...ready('event'), price: '5000' };
    expect(canLeaveStep(paid, 'price', NOW)).toBe(true);
    expect(stepIssues({ ...paid, externalUrl: 'http://tix.example.com' }, 'price', NOW).externalUrl).toBe(
      'notHttps',
    );
    expect(canLeaveStep({ ...paid, externalUrl: 'https://tix.example.com/a' }, 'price', NOW)).toBe(true);
  });

  it('lets every priced type leave the price step blank', () => {
    for (const kind of ['meetup', 'event', 'group'] as const)
      expect(stepIssues(ready(kind), 'price', NOW)).toEqual({});
  });

  it('walks a Plan through four steps, with no price step', () => {
    expect(stepsFor('plan')).toEqual(['basics', 'schedule', 'participants', 'review']);
    expect(stepsFor('group')).toEqual(['basics', 'schedule', 'participants', 'price', 'review']);
    // Whatever a Plan's draft holds there, it does not stand in the way of publishing.
    expect(firstIncompleteStep({ ...ready('plan'), price: 'abc', externalUrl: 'nope' }, NOW)).toBeNull();
  });

  it('holds an Event schedule or Plan itinerary over 30 lines or 120 characters a line', () => {
    const lines = (n: number, text = 'Stop') => Array.from({ length: n }, (_, i) => ({ key: `n${i}`, text }));
    expect(stepIssues({ ...ready('plan'), notes: lines(31) }, 'schedule', NOW).notes).toBe('tooManyLines');
    expect(stepIssues({ ...ready('event'), notes: lines(1, 'x'.repeat(121)) }, 'schedule', NOW).notes).toBe(
      'lineTooLong',
    );
    expect(stepIssues({ ...ready('plan'), notes: lines(30, 'x'.repeat(120)) }, 'schedule', NOW).notes).toBeUndefined();
    // A Meetup has no list, so its lines are never checked or sent.
    expect(stepIssues({ ...ready('meetup'), notes: lines(31) }, 'schedule', NOW).notes).toBeUndefined();
  });

  it('holds a monthly Group to the 1st to the 28th, and its last date to after the first', () => {
    const monthly = { ...ready('group'), date: new Date(2026, 9, 30), recurrence: 'monthly' as const };
    expect(stepIssues(monthly, 'schedule', NOW).recurrence).toBe('monthlyDay');
    expect(stepIssues({ ...monthly, recurrence: 'weekly' }, 'schedule', NOW).recurrence).toBeUndefined();
    expect(
      stepIssues({ ...ready('group'), recurrence: 'weekly', recurrenceEndsOn: new Date(2026, 9, 21) }, 'schedule', NOW)
        .recurrenceEndsOn,
    ).toBe('endsBeforeStart');
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

  it('takes a Meetup, Event or Group amount as a price per person', () => {
    expect(priceCentsOf({ ...ready('event'), price: '5000' })).toBe(500_000);
    expect(priceCentsOf({ ...ready('meetup'), price: '5000' })).toBe(500_000);
    expect(priceCentsOf({ ...ready('group'), price: '5000' })).toBe(500_000);
  });

  it('never prices a Plan', () => {
    expect(priceCentsOf({ ...ready('plan'), price: '5000' })).toBeNull();
  });

  it('holds a typed price the API would refuse', () => {
    expect(stepIssues({ ...ready('event'), price: '2000000' }, 'price', NOW).price).toBe('priceRange');
    expect(stepIssues({ ...ready('event'), price: '12.5' }, 'price', NOW).price).toBe('priceRange');
    expect(stepIssues({ ...ready('event'), price: '1000000' }, 'price', NOW).price).toBeUndefined();
  });
});

describe('server errors', () => {
  it('sends each field the server turned down to its step', () => {
    expect(stepOfField('itinerary[2]', 'plan')).toBe('schedule');
    expect(stepOfField('schedule', 'event')).toBe('schedule');
    expect(stepOfField('recurrence', 'group')).toBe('schedule');
    expect(stepOfField('endAt', 'event')).toBe('schedule');
    // "A place is needed": a Plan's is its destination, a Meetup's its meeting point.
    expect(stepOfField('placeId', 'plan')).toBe('basics');
    expect(stepOfField('placeId', 'meetup')).toBe('schedule');
    expect(stepOfField('lat', 'event')).toBe('schedule');
    expect(stepOfField('priceCents', 'event')).toBe('price');
    expect(stepOfField('externalUrl', 'group')).toBe('price');
    expect(stepOfField('interestIds', 'meetup')).toBe('review');
    expect(stepOfField('somethingNew', 'meetup')).toBe('review');
  });

  it('keeps a price error on a Plan on the review step, as it has no price step', () => {
    expect(stepOfField('priceCents', 'plan')).toBe('review');
  });
});

describe('what is sent', () => {
  it('builds the form, leaving blank fields out', () => {
    const s = toSubmission({ ...ready(), price: '15000' });
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
    // A Meetup has no lines or repeat in the API, whatever the draft holds.
    for (const key of ['schedule', 'itinerary', 'recurrence', 'placeId', 'cityId', 'endAt', 'externalUrl'])
      expect(s).not.toHaveProperty(key);
  });

  it('sends the end time as endAt when it is after the start', () => {
    const s = toSubmission({ ...ready('event'), endTime: new Date(2026, 0, 1, 22, 0) });
    expect(s.endAt).toMatch(/^2026-10-22T22:00:00[+-]\d{2}:\d{2}$/);
    expect(
      toSubmission({ ...ready('event'), endTime: new Date(2026, 0, 1, 16, 0) }),
    ).not.toHaveProperty('endAt');
  });

  it("sends a Plan's destination as its place when it has no meeting point, and its lines as the itinerary", () => {
    const plan = {
      ...ready('plan'),
      place: '',
      placeCoords: null,
      notes: [
        { key: 'a', text: 'Day 1 · Arrival + dinner' },
        { key: 'b', text: '  ' },
      ],
    };
    const s = toSubmission(plan);
    // The label is the city's name, as the server would choose.
    expect(s).toMatchObject({ placeId: 'g-ams', placeName: 'Amsterdam', itinerary: ['Day 1 · Arrival + dinner'] });
    for (const key of ['lat', 'lng', 'cityId', 'schedule']) expect(s).not.toHaveProperty(key);
  });

  it('sends one place, never a place id with a pin: venue, then typed pin, then destination', () => {
    const terra = { placeId: 'g-terra', name: 'Terra Kulture', address: 'Victoria Island', coords: { lat: 6.43, lng: 3.42 } };
    // A picked venue goes by its id, even though its coordinates are known.
    const picked = toSubmission({ ...ready('meetup'), place: 'Terra Kulture', venue: terra, placeCoords: null });
    expect(picked).toMatchObject({ placeId: 'g-terra', placeName: 'Terra Kulture' });
    for (const key of ['lat', 'lng']) expect(picked).not.toHaveProperty(key);
    // A typed meeting point on a Plan beats the destination.
    const typed = toSubmission(ready('plan'));
    expect(typed).toMatchObject({ lat: 6.44, lng: 3.47, placeName: 'Lekki, Lagos' });
    expect(typed).not.toHaveProperty('placeId');
    // Nothing found yet on a Meetup: no place at all, rather than a half one.
    const none = toSubmission({ ...ready('meetup'), placeCoords: null });
    for (const key of ['placeId', 'lat', 'lng']) expect(none).not.toHaveProperty(key);
  });

  it("sends an Event's lines as its schedule and a Group's repeat", () => {
    const event = { ...ready('event'), notes: [{ key: 'a', text: 'Doors open' }] };
    expect(toSubmission(event)).toMatchObject({ schedule: ['Doors open'] });
    expect(toSubmission(event)).not.toHaveProperty('itinerary');
    const group = {
      ...ready('group'),
      notes: [{ key: 'a', text: 'Every Saturday' }],
      recurrence: 'biweekly' as const,
      recurrenceEndsOn: new Date(2027, 0, 9),
    };
    const s = toSubmission(group);
    expect(s.recurrence).toEqual({ frequency: 'biweekly', endsOn: '2027-01-09' });
    expect(s).not.toHaveProperty('schedule');
    expect(s).not.toHaveProperty('itinerary');
  });

  it('sends no price or link when they were left blank', () => {
    const s = toSubmission({ ...ready('event'), price: ' ', externalUrl: '' });
    for (const key of ['priceCents', 'currency', 'externalUrl']) expect(s).not.toHaveProperty(key);
  });

  it('sends a paid Event its price and link, and a Group its price', () => {
    expect(
      toSubmission({ ...ready('event'), price: '5000', currency: 'USD', externalUrl: ' https://tix.ng/e/1 ' }),
    ).toMatchObject({ priceCents: 500_000, currency: 'USD', externalUrl: 'https://tix.ng/e/1' });
    expect(toSubmission({ ...ready('group'), price: '2000' })).toMatchObject({ priceCents: 200_000 });
  });

  it('never sends a price, currency or link on a Plan, whatever the draft holds', () => {
    const s = toSubmission({ ...ready('plan'), price: '5000', currency: 'USD', externalUrl: 'https://x.ng/a' });
    for (const key of ['priceCents', 'currency', 'externalUrl']) expect(s).not.toHaveProperty(key);
  });

  it('sends every line as typed, not cut to the limits', () => {
    const long = 'x'.repeat(130);
    expect(toSubmission({ ...ready('plan'), notes: [{ key: 'a', text: long }] }).itinerary).toEqual([long]);
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
