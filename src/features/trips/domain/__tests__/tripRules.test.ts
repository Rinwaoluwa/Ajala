import { describe, expect, it } from '@jest/globals';

import type { TripCard } from '../entities/Trip';
import type { TripsRepository } from '../repositories/TripsRepository';
import { soonestFirst, upcomingOnly } from '../rules/tripRules';
import { makeLoadUpcoming } from '../usecases/TripsUseCases';

const NOW = new Date('2026-11-02T12:00:00Z');

const trip = (id: string, startAt: string | null, status: TripCard['status'] = 'published'): TripCard => ({
  id,
  type: 'plan',
  title: id,
  imageUrl: null,
  startAt,
  placeName: null,
  cityLabel: 'Accra, Ghana',
  goingCount: 3,
  status,
});

describe('upcoming trips', () => {
  it('keeps posts still to come and drops past, unscheduled and taken-down ones', () => {
    const items = [
      trip('future', '2026-11-20T10:00:00Z'),
      trip('past', '2026-10-01T10:00:00Z'),
      trip('draftish', null),
      trip('removed', '2026-12-01T10:00:00Z', 'taken_down'),
      trip('called-off', '2026-11-10T10:00:00Z', 'cancelled'),
    ];
    expect(upcomingOnly(items, NOW).map((t) => t.id)).toEqual(['future', 'called-off']);
  });

  it('orders them soonest first', () => {
    const items = [trip('b', '2026-11-20T10:00:00Z'), trip('a', '2026-11-05T10:00:00Z')];
    expect(items.sort(soonestFirst).map((t) => t.id)).toEqual(['a', 'b']);
  });

  it('filters each hosted page but keeps its cursor, so paging carries on', async () => {
    const repo: TripsRepository = {
      listHosted: async () => ({ items: [trip('past', '2020-01-01T10:00:00Z')], nextCursor: 'c2' }),
      listAttended: async () => ({ items: [], nextCursor: null }),
    };
    expect(await makeLoadUpcoming(repo)(null)).toEqual({ items: [], nextCursor: 'c2' });
  });
});
