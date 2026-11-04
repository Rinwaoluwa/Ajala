import { describe, expect, it } from '@jest/globals';

import type { SavedPost } from '../entities/PostDraft';
import { draftFromSaved, toSubmission } from '../rules/postDraftRules';

const saved: SavedPost = {
  id: 'd1',
  type: 'plan',
  title: 'Amsterdam After Dark',
  description: 'Canal walk and dinner.',
  startAt: '2026-11-18T19:30:00+01:00',
  placeName: 'Amsterdam Centrum',
  lat: 52.37,
  lng: 4.9,
  city: { id: 'ams', name: 'Amsterdam', label: 'Amsterdam, Netherlands' },
  capacity: 8,
  priceCents: 1_500_000,
  currency: 'NGN',
  externalUrl: null,
  waitlistEnabled: true,
  visibility: 'private',
  showOnMap: false,
  interestIds: ['food', 'art', 'music', 'extra'],
  checklist: ['Day 1 · Arrival', 'Day 2 · Museums'],
  imageUrls: ['https://cdn/a.jpg', 'https://cdn/b.jpg'],
};

describe('carrying on with a saved draft', () => {
  it('fills every step from the saved post', () => {
    const d = draftFromSaved(saved);
    expect(d).toMatchObject({
      kind: 'plan',
      title: 'Amsterdam After Dark',
      description: 'Canal walk and dinner.',
      city: { id: 'ams', lat: 52.37, lng: 4.9 },
      place: 'Amsterdam Centrum',
      placeCoords: { lat: 52.37, lng: 4.9 },
      capacity: 8,
      visibility: 'private',
      showOnMap: false,
      waitlist: true,
      costOn: true,
      currency: 'NGN',
      interestIds: ['food', 'art', 'music'],
    });
    expect(d.photos.map((p) => p.uri)).toEqual(['https://cdn/a.jpg', 'https://cdn/b.jpg']);
    expect(d.notes.map((n) => n.text)).toEqual(['Day 1 · Arrival', 'Day 2 · Museums']);
    expect(d.date && d.startTime).toBeTruthy();
  });

  it('sends the same price it was saved with', () => {
    expect(toSubmission(draftFromSaved(saved))).toMatchObject({ priceCents: 1_500_000, currency: 'NGN' });
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
      priceCents: null,
      currency: null,
      checklist: [],
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
