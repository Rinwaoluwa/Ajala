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
  // A typed meeting point, found as a pin: no place id or address.
  placeName: 'Amsterdam Centrum',
  placeId: null,
  formattedAddress: null,
  localityLabel: 'Amsterdam, Netherlands',
  lat: 52.37,
  lng: 4.9,
  capacity: 8,
  priceCents: null,
  currency: null,
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
      destination: { placeId: null, name: 'Amsterdam', address: 'Amsterdam, Netherlands' },
      place: 'Amsterdam Centrum',
      venue: null,
      placeCoords: { lat: 52.37, lng: 4.9 },
      capacity: 8,
      visibility: 'private',
      showOnMap: false,
      waitlist: true,
      price: '',
      externalUrl: '',
      interestIds: ['food', 'art', 'music'],
    });
    expect(d.endTime?.getTime()).toBe(new Date('2026-11-18T23:00:00+01:00').getTime());
    expect(d.photos.map((p) => p.uri)).toEqual(['https://cdn/a.jpg', 'https://cdn/b.jpg']);
    expect(d.notes.map((n) => n.text)).toEqual(['Day 1 · Arrival', 'Day 2 · Museums']);
    expect(d.date && d.startTime).toBeTruthy();
  });

  it('sends back the same end and itinerary it was saved with', () => {
    const s = toSubmission(draftFromSaved(saved));
    expect(s).toMatchObject({ itinerary: ['Day 1 · Arrival', 'Day 2 · Museums'] });
    expect(s).not.toHaveProperty('priceCents');
    expect(new Date(s.endAt ?? '').getTime()).toBe(new Date(saved.endAt ?? '').getTime());
  });

  it("keeps a Plan's destination as its place when its label is just the city", () => {
    const d = draftFromSaved({ ...saved, placeId: 'g-ams', placeName: 'Amsterdam' });
    expect(d).toMatchObject({ destination: { placeId: 'g-ams', name: 'Amsterdam' }, place: '', venue: null });
    expect(toSubmission(d)).toMatchObject({ placeId: 'g-ams', placeName: 'Amsterdam' });
    expect(toSubmission(d)).not.toHaveProperty('lat');
  });

  it("restores a picked venue and sends it back by its id, keeping a Plan's destination unsent", () => {
    const d = draftFromSaved({
      ...saved,
      placeId: 'g-ams-centraal',
      placeName: 'Amsterdam Centraal',
      formattedAddress: 'Stationsplein, Amsterdam, Netherlands',
    });
    expect(d).toMatchObject({
      place: 'Amsterdam Centraal',
      venue: { placeId: 'g-ams-centraal', address: 'Stationsplein, Amsterdam, Netherlands' },
      placeCoords: null,
      // The server no longer says which Google place the city was.
      destination: { placeId: null, name: 'Amsterdam' },
    });
    const s = toSubmission(d);
    expect(s).toMatchObject({ placeId: 'g-ams-centraal', placeName: 'Amsterdam Centraal' });
    for (const key of ['lat', 'lng']) expect(s).not.toHaveProperty(key);
  });

  it("restores a Meetup's venue, or its typed place with the pin", () => {
    const meetup = { ...saved, type: 'meetup' as const, itinerary: [] };
    const venue = draftFromSaved({ ...meetup, placeId: 'g-terra', placeName: 'Terra Kulture' });
    expect(venue).toMatchObject({ destination: null, place: 'Terra Kulture', venue: { placeId: 'g-terra' } });
    const typed = draftFromSaved(meetup);
    expect(typed).toMatchObject({ place: 'Amsterdam Centrum', venue: null, placeCoords: { lat: 52.37, lng: 4.9 } });
    expect(toSubmission(typed)).toMatchObject({ lat: 52.37, lng: 4.9 });
  });

  it("drops an older Plan's price and link, since a Plan carries no money now", () => {
    const d = draftFromSaved({ ...saved, priceCents: 1_500_000, currency: 'USD', externalUrl: 'https://x.ng/a' });
    expect(d).toMatchObject({ price: '', currency: 'NGN', externalUrl: '' });
    const s = toSubmission(d);
    for (const key of ['priceCents', 'currency', 'externalUrl']) expect(s).not.toHaveProperty(key);
  });

  it("keeps a Group's price and link", () => {
    const d = draftFromSaved({
      ...saved,
      type: 'group',
      itinerary: [],
      priceCents: 200_000,
      currency: 'USD',
      externalUrl: 'https://club.ng/join',
    });
    expect(d).toMatchObject({ price: '2000', currency: 'USD', externalUrl: 'https://club.ng/join' });
    expect(toSubmission(d)).toMatchObject({ priceCents: 200_000, currency: 'USD', externalUrl: 'https://club.ng/join' });
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
      priceCents: 500_000,
      currency: 'NGN',
      itinerary: [],
      schedule: ['Doors open', 'Main act'],
    });
    expect(event).toMatchObject({ price: '5000' });
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
      localityLabel: null,
      capacity: null,
      endAt: null,
      priceCents: null,
      currency: null,
      itinerary: [],
      imageUrls: [],
    });
    expect(d).toMatchObject({
      kind: 'event',
      date: null,
      startTime: null,
      capacity: null,
      price: '',
      photos: [],
    });
  });
});
