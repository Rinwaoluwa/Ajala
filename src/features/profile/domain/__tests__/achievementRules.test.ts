import { describe, expect, it } from '@jest/globals';

import type { ProfileActivity } from '../entities/PublicProfile';
import {
  BADGES,
  CITY_MILESTONE,
  badgeFilter,
  badgeProgress,
  cityStamps,
  profileCounters,
  streakDays,
  topBadges,
} from '../rules/achievementRules';

// Cards carry `localityLabel` and `countryCode`, no city id (spec §6).
const lagos = { label: 'Lagos, Nigeria', countryCode: 'NG' };
const accra = { label: 'Accra, Ghana', countryCode: 'GH' };
const nairobi = { label: 'Nairobi, Kenya', countryCode: 'KE' };
const interest = (slug: string) => ({ id: slug, slug, name: slug, emoji: null });

let n = 0;
const act = (over: Partial<ProfileActivity> = {}): ProfileActivity => ({
  id: `a${(n += 1)}`,
  type: 'meetup',
  title: `Activity ${n}`,
  imageUrl: null,
  startAt: `2026-0${(n % 9) + 1}-10T10:00:00Z`,
  placeName: null,
  locality: lagos,
  goingCount: 3,
  capacity: null,
  interests: [],
  photoCount: 0,
  host: { id: 'h', name: 'Host', avatarUrl: null },
  distanceKm: null,
  saved: false,
  ...over,
});

const find = (progress: ReturnType<typeof badgeProgress>, id: string) =>
  progress.find((p) => p.badge.id === id);

describe('badges', () => {
  it('earns Trail Seeker on the third hiking experience, and lists the three', () => {
    const attended = [
      act({ interests: [interest('hiking')] }),
      act({ interests: [interest('cycling')] }),
      act({ interests: [interest('food')] }),
    ];
    const two = find(badgeProgress(attended), 'trail-seeker');
    expect(two).toMatchObject({ done: 2, earned: false });
    const three = find(
      badgeProgress([...attended, act({ interests: [interest('hiking')] })]),
      'trail-seeker',
    );
    expect(three).toMatchObject({ done: 3, earned: true });
    expect(three?.experiences).toHaveLength(3);
  });

  it('counts countries once each for Globe Trotter', () => {
    const attended = [act(), act(), act({ locality: accra }), act({ locality: nairobi })];
    expect(find(badgeProgress(attended), 'globe-trotter')).toMatchObject({ done: 3, earned: true });
  });

  it('caps progress at the target', () => {
    const attended = Array.from({ length: 9 }, () => act());
    expect(find(badgeProgress(attended), 'good-company')).toMatchObject({ done: 5, earned: true });
  });

  it('puts earned badges first in the preview, then the closest', () => {
    const attended = [
      ...Array.from({ length: 5 }, () => act()),
      act({ type: 'group' }),
      act({ type: 'group' }),
    ];
    const top = topBadges(badgeProgress(attended));
    expect(top[0]?.badge.id).toBe('good-company');
    expect(top[1]?.badge.id).toBe('group-regular');
  });

  it('filters by category', () => {
    const groups = badgeFilter(badgeProgress([]), 'groups');
    expect(groups.every((p) => p.badge.category === 'groups')).toBe(true);
    expect(badgeFilter(badgeProgress([]), 'all')).toHaveLength(BADGES.length);
  });
});

describe('stamps and counters', () => {
  it('makes one stamp per city, most visited first, with its milestone', () => {
    const attended = [
      act({ locality: accra, interests: [interest('food')] }),
      ...Array.from({ length: 6 }, (_, i) => act({ interests: [interest(i % 2 ? 'food' : 'art')] })),
    ];
    const stamps = cityStamps(attended);
    expect(stamps.map((s) => s.city)).toEqual(['Lagos', 'Accra']);
    expect(stamps[0]).toMatchObject({ country: 'Nigeria', experiences: 2, milestone: CITY_MILESTONE });
    expect(stamps[0]?.activities).toHaveLength(6);
  });

  it('counts events and distinct countries', () => {
    expect(profileCounters([act(), act({ locality: accra }), act({ locality: accra })])).toEqual({
      events: 3,
      countries: 2,
    });
    expect(profileCounters([])).toEqual({ events: 0, countries: 0 });
  });

  it('counts a post with no city as an event, but stamps no city or country for it', () => {
    const attended = [act({ locality: null }), act({ locality: accra })];
    expect(cityStamps(attended).map((s) => s.city)).toEqual(['Accra']);
    expect(profileCounters(attended)).toEqual({ events: 2, countries: 1 });
  });
});

describe('streakDays', () => {
  const now = new Date('2026-11-11T12:00:00Z');
  const at = (iso: string) => act({ startAt: iso });

  it('is zero with nothing attended, or nothing in the last week', () => {
    expect(streakDays([], now)).toBe(0);
    expect(streakDays([at('2026-11-01T12:00:00Z')], now)).toBe(0);
  });

  it('runs back through meetups no more than a week apart', () => {
    const attended = [
      at('2026-11-09T12:00:00Z'),
      at('2026-11-03T12:00:00Z'),
      at('2026-10-27T12:00:00Z'),
      // Eleven days before the next: the streak starts after it.
      at('2026-10-16T12:00:00Z'),
    ];
    expect(streakDays(attended, now)).toBe(15);
  });

  it('counts a meetup today as one day, and ignores drafts and future posts', () => {
    expect(streakDays([at('2026-11-11T09:00:00Z'), act({ startAt: null }), at('2026-11-20T09:00:00Z')], now)).toBe(1);
  });
});
