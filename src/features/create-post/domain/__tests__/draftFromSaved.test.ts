import { describe, expect, it } from '@jest/globals';

import type { SavedPost } from '../entities/PostDraft';
import { draftFromSaved, toSubmission } from '../rules/postDraftRules';

const saved: SavedPost = {
  id: 'd1',
  type: 'plan',
  title: 'Amsterdam After Dark',
  description: 'Canal walk and dinner.',
  startAt: '2026-11-18T19:30:00+01:00',
  endAt: '2026-11-18T23:00:00+01:00',
  placeName: 'Amsterdam Centrum',
  lat: 52.37,
  lng: 4.9,
  city: { id: 'ams', name: 'Amsterdam', label: 'Amsterdam, Netherlands' },
  capacity: 8,
  priceCents: null,
  currency: null,
  costSplit: { totalCents: 6_000_000, currency: 'NGN', expectedCount: 4 },
  externalUrl: null,
  waitlistEnabled: true,
  visibility: 'private',
  showOnMap: false,
  interestIds: ['food', 'art', 'music', 'extra'],
  schedule: [],
  itinerary: ['Day 1 · Arrival', 'Day 2 · Museums'],
  recurrence: null,
  imageUrls: ['https://cdn/a.jpg', 'https://cdn/b.jpg'],
};

describe('carrying on with a saved draft', () => {
  it('fills every step from the saved post', () => {
    const d = draftFromSaved(saved);
    expect(d).toMatchObject({
      kind: 'plan',
      title: 'Amsterdam After Dark',
      description: 'Canal walk and dinner.',
      city: { id: 'ams', name: 'Amsterdam', label: 'Amsterdam, Netherlands' },
      place: 'Amsterdam Centrum',
      placeCoords: { lat: 52.37, lng: 4.9 },
      capacity: 8,
      visibility: 'private',
      showOnMap: false,
      waitlist: true,
      costOn: true,
      currency: 'NGN',
      amount: '60000',
      expected: '4',
      interestIds: ['food', 'art', 'music'],
    });
    expect(d.endTime?.getTime()).toBe(new Date('2026-11-18T23:00:00+01:00').getTime());
    expect(d.photos.map((p) => p.uri)).toEqual(['https://cdn/a.jpg', 'https://cdn/b.jpg']);
    expect(d.notes.map((n) => n.text)).toEqual(['Day 1 · Arrival', 'Day 2 · Museums']);
    expect(d.date && d.startTime).toBeTruthy();
  });

  it('sends back the same shared cost, end and itinerary it was saved with', () => {
    const s = toSubmission(draftFromSaved(saved));
    expect(s).toMatchObject({
      cost: { totalCents: 6_000_000, currency: 'NGN', expectedCount: 4 },
      itinerary: ['Day 1 · Arrival', 'Day 2 · Museums'],
    });
    expect(s).not.toHaveProperty('priceCents');
    expect(new Date(s.endAt ?? '').getTime()).toBe(new Date(saved.endAt ?? '').getTime());
  });

  it('keeps the city of a Plan with no pin, and sends it as cityId', () => {
    const d = draftFromSaved({ ...saved, lat: null, lng: null, placeName: null });
    expect(d.city?.id).toBe('ams');
    expect(toSubmission(d)).toMatchObject({ cityId: 'ams' });
    expect(toSubmission(d)).not.toHaveProperty('lat');
  });

  it("carries an older Plan's per-person price over as a total for one", () => {
    const d = draftFromSaved({ ...saved, costSplit: null, priceCents: 1_500_000, currency: 'USD' });
    expect(d).toMatchObject({ costOn: true, currency: 'USD', amount: '15000', expected: '1' });
    expect(toSubmission(d).cost).toEqual({ totalCents: 1_500_000, currency: 'USD', expectedCount: 1 });
  });

  it("restores a Group's repeat and an Event's price and schedule", () => {
    const group = draftFromSaved({
      ...saved,
      type: 'group',
      itinerary: [],
      recurrence: { frequency: 'monthly', endsOn: '2027-03-01' },
    });
    expect(group.recurrence).toBe('monthly');
    expect(group.recurrenceEndsOn?.getFullYear()).toBe(2027);
    expect(toSubmission(group).recurrence).toEqual({ frequency: 'monthly', endsOn: '2027-03-01' });

    const event = draftFromSaved({
      ...saved,
      type: 'event',
      costSplit: null,
      priceCents: 500_000,
      currency: 'NGN',
      itinerary: [],
      schedule: ['Doors open', 'Main act'],
    });
    expect(event).toMatchObject({ costOn: true, amount: '5000' });
    expect(event.notes.map((n) => n.text)).toEqual(['Doors open', 'Main act']);
    expect(toSubmission(event)).toMatchObject({ priceCents: 500_000, schedule: ['Doors open', 'Main act'] });
  });

  it('copes with a bare draft that has only a title', () => {
    const d = draftFromSaved({
      ...saved,
      type: 'event',
      description: '',
      startAt: null,
      placeName: null,
      lat: null,
      lng: null,
      city: null,
      capacity: null,
      endAt: null,
      priceCents: null,
      currency: null,
      costSplit: null,
      itinerary: [],
      imageUrls: [],
    });
    expect(d).toMatchObject({
      kind: 'event',
      date: null,
      startTime: null,
      capacity: null,
      costOn: false,
      photos: [],
    });
  });
});
