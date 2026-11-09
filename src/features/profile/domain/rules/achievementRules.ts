import type { PostKind, ProfileActivity } from '../entities/PublicProfile';

/**
 * Badges, stamps and the profile counters, worked out on the phone from the
 * posts a person attended (`GET /me/attended`, `GET /users/:id/attended`).
 *
 * There is no achievements API (API map §12): no badges, stamps, streaks or
 * counters are stored anywhere. Deriving them from real attendance keeps every
 * number true — nothing here is invented — and the catalogue can move to the
 * server later without the screens changing.
 */

/** Which filter pill a badge sits under (Achievements: All / Events / Groups / Plans). */
export type BadgeCategory = 'events' | 'groups' | 'plans' | 'general';

/** How a badge is drawn: its shape, colour family and ribbon word. */
export type BadgeLook = {
  shape: 'shield' | 'hexagon';
  tone: 'teal' | 'gold' | 'purple' | 'blue' | 'coral' | 'pink';
  ribbon: string;
};

export type Badge = {
  id: string;
  name: string;
  rule: string;
  category: BadgeCategory;
  target: number;
  look: BadgeLook;
  /** The attended posts that count towards it, one per unit of progress. */
  qualifying: (attended: readonly ProfileActivity[]) => ProfileActivity[];
};

const withInterest = (slugs: readonly string[]) => (attended: readonly ProfileActivity[]) =>
  attended.filter((a) => a.interests.some((i) => slugs.includes(i.slug)));

const ofType = (type: PostKind) => (attended: readonly ProfileActivity[]) =>
  attended.filter((a) => a.type === type);

/** A post with a place, which is all that can count toward places (`localityLabel` may be null, spec §6). */
type PlacedActivity = ProfileActivity & {
  locality: NonNullable<ProfileActivity['locality']>;
};
const placed = (attended: readonly ProfileActivity[]): PlacedActivity[] =>
  attended.filter((a): a is PlacedActivity => a.locality !== null);

/** "Lagos, Nigeria" → "Nigeria": everything after the city. */
const countryOfLabel = (label: string) => label.split(',').slice(1).join(',').trim();

/**
 * Which country a post is in: its country code, or the country in its label
 * when the server sent no code. Never empty for a placed post.
 */
const countryKey = (a: PlacedActivity) =>
  a.locality.countryCode ?? (countryOfLabel(a.locality.label) || a.locality.label);

/** One post per country, the earliest there. */
function onePerCountry(attended: readonly ProfileActivity[]): ProfileActivity[] {
  const seen = new Set<string>();
  return placed(attended)
    .sort(byDate)
    .filter((a) => !seen.has(countryKey(a)) && !!seen.add(countryKey(a)));
}

const byDate = (a: ProfileActivity, b: ProfileActivity) => (a.startAt ?? '').localeCompare(b.startAt ?? '');

export const BADGES: readonly Badge[] = [
  {
    id: 'trail-seeker',
    name: 'Trail Seeker',
    rule: 'Complete 3 hiking or adventure experiences.',
    category: 'plans',
    target: 3,
    look: { shape: 'shield', tone: 'teal', ribbon: 'SEEKER' },
    qualifying: withInterest(['hiking', 'cycling', 'beach']),
  },
  {
    id: 'ajala-foodie',
    name: 'Ajala Foodie',
    rule: 'Join 3 food, coffee or market experiences.',
    category: 'events',
    target: 3,
    look: { shape: 'hexagon', tone: 'gold', ribbon: 'FOODIE' },
    qualifying: withInterest(['food', 'coffee', 'markets']),
  },
  {
    id: 'good-company',
    name: 'Good Company',
    rule: 'Join 5 experiences with other travellers.',
    category: 'general',
    target: 5,
    look: { shape: 'shield', tone: 'purple', ribbon: 'SOCIAL' },
    qualifying: (attended) => [...attended],
  },
  {
    id: 'memory-maker',
    name: 'Memory Maker',
    rule: 'Join 5 experiences that shared photos.',
    category: 'events',
    target: 5,
    look: { shape: 'hexagon', tone: 'blue', ribbon: 'MEMORY' },
    qualifying: (attended) => attended.filter((a) => a.photoCount > 0),
  },
  {
    id: 'globe-trotter',
    name: 'Globe Trotter',
    rule: 'Join experiences in 3 different countries.',
    category: 'plans',
    target: 3,
    look: { shape: 'shield', tone: 'pink', ribbon: 'GLOBE' },
    qualifying: onePerCountry,
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    rule: 'Join 3 live music or nightlife events.',
    category: 'events',
    target: 3,
    look: { shape: 'hexagon', tone: 'purple', ribbon: 'NIGHT' },
    qualifying: withInterest(['music', 'nightlife']),
  },
  {
    id: 'group-regular',
    name: 'Group Regular',
    rule: 'Join 3 group activities.',
    category: 'groups',
    target: 3,
    look: { shape: 'shield', tone: 'coral', ribbon: 'GROUPS' },
    qualifying: ofType('group'),
  },
  {
    id: 'plan-maker',
    name: 'Plan Maker',
    rule: 'Go on 3 plans with other travellers.',
    category: 'plans',
    target: 3,
    look: { shape: 'hexagon', tone: 'gold', ribbon: 'PLANS' },
    qualifying: ofType('plan'),
  },
  {
    id: 'culture-seeker',
    name: 'Culture Seeker',
    rule: 'Join 3 arts, culture or photography experiences.',
    category: 'events',
    target: 3,
    look: { shape: 'shield', tone: 'blue', ribbon: 'CULTURE' },
    qualifying: withInterest(['art', 'photography']),
  },
];

export type BadgeProgress = {
  badge: Badge;
  /** Counted towards it, capped at the target. */
  done: number;
  earned: boolean;
  /** The posts that count, earliest first, at most `target`. */
  experiences: ProfileActivity[];
};

export function badgeProgress(attended: readonly ProfileActivity[]): BadgeProgress[] {
  return BADGES.map((badge) => {
    const experiences = [...badge.qualifying(attended)].sort(byDate).slice(0, badge.target);
    return { badge, done: experiences.length, earned: experiences.length >= badge.target, experiences };
  });
}

/** Earned first, then the closest to earning, for the profile's three-badge preview. */
export function topBadges(progress: readonly BadgeProgress[], count = 3): BadgeProgress[] {
  return [...progress]
    .sort((a, b) => Number(b.earned) - Number(a.earned) || b.done / b.badge.target - a.done / a.badge.target)
    .slice(0, count);
}

export function badgeFilter(progress: readonly BadgeProgress[], category: BadgeCategory | 'all') {
  return category === 'all' ? [...progress] : progress.filter((p) => p.badge.category === category);
}

// ---------- stamps ----------

/** A city's passport stamp: one per city the person attended something in. */
export type CityStamp = {
  /** The post's `localityLabel` ("Lagos, Nigeria"): cards carry no city id, so this tells cities apart. */
  cityId: string;
  city: string;
  /** "Nigeria" — from the city's label ("Lagos, Nigeria"); the code when the label has none. */
  country: string;
  activities: ProfileActivity[];
  /** Different interests explored there. */
  experiences: number;
  /** The first visit, ISO date-time. */
  firstVisit: string | null;
  /** Toward the city milestone: attended there, capped at `CITY_MILESTONE`. */
  milestone: number;
};

/** Activities in one city that complete its milestone ("Lagos progress 5/5"). */
export const CITY_MILESTONE = 5;

export function cityStamps(attended: readonly ProfileActivity[]): CityStamp[] {
  // A post with no place stamps nowhere.
  const byCity = new Map<string, PlacedActivity[]>();
  for (const a of placed(attended)) {
    const key = a.locality.label;
    byCity.set(key, [...(byCity.get(key) ?? []), a]);
  }
  return [...byCity.values()]
    .map((list) => {
      const sorted = [...list].sort(byDate);
      const first = sorted[0] as PlacedActivity;
      const { label, countryCode } = first.locality;
      return {
        cityId: label,
        city: label.split(',')[0]?.trim() || label,
        country: countryOfLabel(label) || countryCode || '',
        activities: [...sorted].reverse(),
        experiences: new Set(sorted.flatMap((a) => a.interests.map((i) => i.id))).size,
        firstVisit: first.startAt,
        milestone: Math.min(sorted.length, CITY_MILESTONE),
      };
    })
    .sort((a, b) => b.activities.length - a.activities.length);
}

// ---------- counters ----------

/** The profile header's Events and Countries. There is no data for a streak (API map §12). */
export function profileCounters(attended: readonly ProfileActivity[]) {
  return {
    events: attended.length,
    countries: new Set(placed(attended).map(countryKey)).size,
  };
}
