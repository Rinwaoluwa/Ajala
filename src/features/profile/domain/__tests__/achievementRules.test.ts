import { describe, expect, it } from '@jest/globals';

import type { ProfileActivity } from '../entities/PublicProfile';
import {
  BADGES,
  CITY_MILESTONE,
  badgeFilter,
  badgeProgress,
  cityStamps,
  profileCounters,
  topBadges,
} from '../rules/achievementRules';

const lagos = { id: 'lagos', name: 'Lagos', countryCode: 'NG', label: 'Lagos, Nigeria' };
const accra = { id: 'accra', name: 'Accra', countryCode: 'GH', label: 'Accra, Ghana' };
const nairobi = { id: 'nairobi', name: 'Nairobi', countryCode: 'KE', label: 'Nairobi, Kenya' };
const interest = (slug: string) => ({ id: slug, slug, name: slug, emoji: null });

let n = 0;
const act = (over: Partial<ProfileActivity> = {}): ProfileActivity => ({
  id: `a${(n += 1)}`,
  type: 'meetup',
  title: `Activity ${n}`,
  imageUrl: null,
  startAt: `2026-0${(n % 9) + 1}-10T10:00:00Z`,
  placeName: null,
  city: lagos,
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
    const attended = [act(), act(), act({ city: accra }), act({ city: nairobi })];
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
      act({ city: accra, interests: [interest('food')] }),
      ...Array.from({ length: 6 }, (_, i) => act({ interests: [interest(i % 2 ? 'food' : 'art')] })),
    ];
    const stamps = cityStamps(attended);
    expect(stamps.map((s) => s.city)).toEqual(['Lagos', 'Accra']);
    expect(stamps[0]).toMatchObject({ country: 'Nigeria', experiences: 2, milestone: CITY_MILESTONE });
    expect(stamps[0]?.activities).toHaveLength(6);
  });

  it('counts events and distinct countries', () => {
    expect(profileCounters([act(), act({ city: accra }), act({ city: accra })])).toEqual({
      events: 3,
      countries: 2,
    });
    expect(profileCounters([])).toEqual({ events: 0, countries: 0 });
  });

  it('counts a post with no city as an event, but stamps no city or country for it', () => {
    const attended = [act({ city: null }), act({ city: accra })];
    expect(cityStamps(attended).map((s) => s.city)).toEqual(['Accra']);
    expect(profileCounters(attended)).toEqual({ events: 2, countries: 1 });
  });
});
