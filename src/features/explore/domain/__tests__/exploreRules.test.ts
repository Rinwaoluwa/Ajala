import { describe, expect, it } from '@jest/globals';

import type { MapPin, PostPreview } from '../entities/Explore';
import {
  REPORT_DETAILS_MAX,
  canSubmitReport,
  isHappeningToday,
  matchesSearch,
  optimisticJoin,
  reportDetailsRoom,
  rsvpAction,
  spotsLeft,
  toReportPayload,
  visiblePins,
} from '../rules/exploreRules';

const POST: PostPreview = {
  id: 'p1',
  type: 'meetup',
  title: 'Lagos Tech Founders Networking',
  imageUrl: null,
  startAt: '2026-10-04T18:00:00+01:00',
  placeName: 'The Nest',
  capacity: 60,
  goingCount: 47,
  price: null,
  joinMode: 'rsvp',
  externalUrl: null,
  visibility: 'open',
  rsvpState: 'none',
  waitlistPosition: null,
  isHost: false,
};

describe('happening today', () => {
  const now = new Date(2026, 9, 28, 9, 0);
  const pin = (id: string, startAt: Date): MapPin => ({
    id,
    type: 'event',
    lat: 0,
    lng: 0,
    title: id,
    startAt: startAt.toISOString(),
  });

  it('is the same local calendar day', () => {
    expect(isHappeningToday(new Date(2026, 9, 28, 23, 30).toISOString(), now)).toBe(true);
    expect(isHappeningToday(new Date(2026, 9, 29, 0, 30).toISOString(), now)).toBe(false);
    expect(isHappeningToday('not a date', now)).toBe(false);
  });

  it('filters pins only when on', () => {
    const pins = [pin('today', new Date(2026, 9, 28, 20)), pin('later', new Date(2026, 10, 2, 20))];
    expect(visiblePins(pins, false, now).map((p) => p.id)).toEqual(['today', 'later']);
    expect(visiblePins(pins, true, now).map((p) => p.id)).toEqual(['today']);
  });
});

describe('spots left', () => {
  it('is capacity minus going, never negative, null without a limit', () => {
    expect(spotsLeft(47, 60)).toBe(13);
    expect(spotsLeft(61, 60)).toBe(0);
    expect(spotsLeft(5, null)).toBeNull();
  });
});

describe('rsvp button', () => {
  it('joins an open post, asks on a private one', () => {
    expect(rsvpAction(POST)).toEqual({ kind: 'join', request: false, price: null });
    expect(rsvpAction({ ...POST, visibility: 'private' })).toEqual({
      kind: 'join',
      request: true,
      price: null,
    });
  });

  it('books a paid Event through its link', () => {
    const price = { amountCents: 500000, currency: 'NGN', exponent: 2 };
    expect(rsvpAction({ ...POST, joinMode: 'external', price })).toEqual({ kind: 'book', price });
  });

  it('follows the state the server gave', () => {
    expect(rsvpAction({ ...POST, rsvpState: 'going' }).kind).toBe('going');
    expect(rsvpAction({ ...POST, rsvpState: 'requested' }).kind).toBe('requested');
    expect(rsvpAction({ ...POST, rsvpState: 'waitlisted', waitlistPosition: 2 })).toEqual({
      kind: 'waitlisted',
      position: 2,
    });
    expect(rsvpAction({ ...POST, rsvpState: 'declined' }).kind).toBe('none');
    expect(rsvpAction({ ...POST, rsvpState: 'removed' }).kind).toBe('none');
    expect(rsvpAction({ ...POST, isHost: true }).kind).toBe('hosting');
  });

  it('shows going (with the count) or requested at once', () => {
    expect(optimisticJoin(POST)).toMatchObject({ rsvpState: 'going', goingCount: 48 });
    expect(optimisticJoin({ ...POST, visibility: 'private' })).toMatchObject({
      rsvpState: 'requested',
      goingCount: 47,
    });
  });
});

describe('report reasons', () => {
  it('sends the reasons the API knows as themselves', () => {
    expect(toReportPayload(['spam'], 'x').reason).toBe('spam');
    expect(toReportPayload(['inappropriate'], 'x').reason).toBe('inappropriate_content');
    expect(toReportPayload(['scam', 'safety'], 'x').reason).toBe('other');
  });

  it('prefers the most specific when several are ticked', () => {
    expect(toReportPayload(['scam', 'spam', 'inappropriate'], 'x').reason).toBe('inappropriate_content');
  });

  it('writes every ticked reason, in list order, before the details', () => {
    expect(toReportPayload(['safety', 'scam'], '  Asked for money upfront. ').details).toBe(
      'Reasons: Scam or fraud, Safety concern.\n\nAsked for money upfront.',
    );
  });

  it('keeps the whole within 500 characters', () => {
    const payload = toReportPayload(['scam'], 'a'.repeat(600));
    expect(payload.details.length).toBe(REPORT_DETAILS_MAX);
    expect(reportDetailsRoom(['scam'])).toBe(REPORT_DETAILS_MAX - 'Reasons: Scam or fraud.\n\n'.length);
  });

  it('needs a reason and some details', () => {
    expect(canSubmitReport([], 'details')).toBe(false);
    expect(canSubmitReport(['spam'], '   ')).toBe(false);
    expect(canSubmitReport(['spam'], 'details')).toBe(true);
  });
});

describe('list search', () => {
  const meetup = {
    id: 'm',
    title: 'Afrobeats after hours',
    imageUrl: null,
    startAt: null,
    placeName: 'The House, Victoria Island',
    goingCount: 16,
    distanceKm: 2.4,
  };
  it('matches title or place, ignoring case; empty matches all', () => {
    expect(matchesSearch(meetup, 'afro')).toBe(true);
    expect(matchesSearch(meetup, 'victoria')).toBe(true);
    expect(matchesSearch(meetup, 'museum')).toBe(false);
    expect(matchesSearch(meetup, '  ')).toBe(true);
  });
});
