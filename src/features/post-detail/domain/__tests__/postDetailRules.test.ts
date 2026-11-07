import { describe, expect, it } from '@jest/globals';

import type { PostDetail } from '../entities/PostDetail';
import { expectJoin, expectLeave, joinAction, postLink, spotsLeft, withRsvp } from '../rules/postDetailRules';

const NOW = new Date('2026-10-20T12:00:00Z');

const post = (over: Partial<PostDetail> = {}): PostDetail => ({
  id: 'p1',
  type: 'plan',
  title: 'Weekend Hike to Erin-Ijesha',
  description: '',
  images: [],
  startAt: '2026-10-25T06:30:00Z',
  endAt: null,
  recurrence: null,
  placeName: 'Erin-Ijesha, Osun State',
  cityLabel: null,
  lat: 7.6,
  lng: 4.9,
  capacity: 12,
  goingCount: 8,
  price: { amount: 15, currency: 'USD', exponent: 2 },
  costSplit: null,
  externalUrl: null,
  joinMode: 'rsvp',
  rsvpState: 'none',
  visibility: 'open',
  waitlistEnabled: false,
  waitlistPosition: null,
  status: 'published',
  isHost: false,
  host: { id: 'h', name: 'Fatima Bello', avatarUrl: null, verified: true },
  saved: false,
  interests: [],
  schedule: [],
  itinerary: [],
  linkClickCount: null,
  ...over,
});

describe('the main button', () => {
  it('follows the RSVP state first', () => {
    expect(joinAction(post({ rsvpState: 'going' }), NOW)).toBe('going');
    expect(joinAction(post({ rsvpState: 'requested' }), NOW)).toBe('requested');
    expect(joinAction(post({ rsvpState: 'waitlisted' }), NOW)).toBe('waitlisted');
    expect(joinAction(post({ rsvpState: 'declined' }), NOW)).toBe('none');
  });

  it('is join, request, waiting list or full by visibility and room', () => {
    expect(joinAction(post(), NOW)).toBe('join');
    expect(joinAction(post({ visibility: 'private' }), NOW)).toBe('request');
    expect(joinAction(post({ goingCount: 12 }), NOW)).toBe('full');
    expect(joinAction(post({ goingCount: 12, waitlistEnabled: true }), NOW)).toBe('joinWaitlist');
  });

  it('has nothing to join or leave once it has started', () => {
    const past = { startAt: '2026-10-19T06:30:00Z' };
    expect(joinAction(post({ ...past, rsvpState: 'going' }), NOW)).toBe('attended');
    expect(joinAction(post({ ...past, rsvpState: 'requested' }), NOW)).toBe('started');
    expect(joinAction(post({ ...past, rsvpState: 'none' }), NOW)).toBe('started');
  });

  it('books a paid Event through its link, and stops once started or cancelled', () => {
    expect(joinAction(post({ joinMode: 'external' }), NOW)).toBe('book');
    expect(joinAction(post({ startAt: '2026-10-19T06:30:00Z' }), NOW)).toBe('started');
    expect(joinAction(post({ status: 'cancelled' }), NOW)).toBe('cancelled');
    expect(joinAction(post({ isHost: true }), NOW)).toBe('host');
  });
});

describe('optimistic RSVP', () => {
  it('expects going on an open post, requested on a private one', () => {
    expect(expectJoin(post())).toMatchObject({ rsvpState: 'going', goingCount: 9 });
    expect(expectJoin(post({ visibility: 'private' }))).toMatchObject({
      rsvpState: 'requested',
      goingCount: 8,
    });
    expect(expectJoin(post({ goingCount: 12 }))).toMatchObject({ rsvpState: 'waitlisted' });
  });

  it('gives the spot back on leaving', () => {
    expect(expectLeave(post({ rsvpState: 'going', goingCount: 9 }))).toMatchObject({
      rsvpState: 'none',
      goingCount: 8,
    });
    expect(expectLeave(post({ rsvpState: 'requested' }))).toMatchObject({ goingCount: 8 });
  });

  it('takes the answer as the truth', () => {
    expect(
      withRsvp(post(), { state: 'waitlisted', goingCount: 12, capacity: 12, waitlistPosition: 2 }),
    ).toMatchObject({
      rsvpState: 'waitlisted',
      goingCount: 12,
      waitlistPosition: 2,
    });
  });
});

describe('helpers', () => {
  it('counts the spots left', () => {
    expect(spotsLeft(post())).toBe(4);
    expect(spotsLeft(post({ capacity: null }))).toBeNull();
    expect(spotsLeft(post({ goingCount: 20 }))).toBe(0);
  });

  it('builds the share link', () => {
    expect(postLink('p 1')).toBe('https://ajalatrvl.com/posts/p%201');
  });
});
