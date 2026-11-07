import { describe, expect, it } from '@jest/globals';

import type { TripCard } from '../entities/Trip';
import type { TripsRepository } from '../repositories/TripsRepository';
import { mergeUpcoming, soonestFirst, upcomingOnly } from '../rules/tripRules';
import { makeLoadGoing, makeLoadHostedUpcoming, makeLoadRequested } from '../usecases/TripsUseCases';

const NOW = new Date('2026-11-02T12:00:00Z');

const trip = (id: string, startAt: string | null, extra: Partial<TripCard> = {}): TripCard => ({
  id,
  type: 'plan',
  title: id,
  imageUrl: null,
  startAt,
  endAt: null,
  recurrence: null,
  placeName: null,
  cityLabel: 'Accra, Ghana',
  goingCount: 3,
  status: 'published',
  role: 'hosting',
  ...extra,
});

const ids = (items: TripCard[]) => items.map((t) => t.id);

const emptyPage = async () => ({ items: [], nextCursor: null });

describe('upcoming trips', () => {
  it('keeps hosted posts that have not ended and drops past, unscheduled and taken-down ones', () => {
    const items = [
      trip('future', '2026-11-20T10:00:00Z'),
      trip('past', '2026-10-01T10:00:00Z'),
      trip('running', '2026-11-01T10:00:00Z', { endAt: '2026-11-03T18:00:00Z' }),
      trip('ended', '2026-10-30T10:00:00Z', { endAt: '2026-11-01T18:00:00Z' }),
      trip('draftish', null),
      trip('removed', '2026-12-01T10:00:00Z', { status: 'taken_down' }),
      trip('called-off', '2026-11-10T10:00:00Z', { status: 'cancelled' }),
    ];
    expect(ids(upcomingOnly(items, NOW))).toEqual(['future', 'running', 'called-off']);
  });

  it('orders them soonest first, as instants rather than strings', () => {
    const items = [
      trip('b', '2026-11-20T10:00:00Z'),
      trip('a', '2026-11-05T10:00:00Z'),
      // 09:30 in Lagos is 08:30 UTC: sooner than "a" on the same day, though it sorts later as text.
      trip('c', '2026-11-05T09:30:00+01:00'),
      trip('undated', null),
    ];
    expect(ids(items.sort(soonestFirst))).toEqual(['c', 'a', 'b', 'undated']);
  });

  it('filters each hosted page but keeps its cursor, so paging carries on', async () => {
    const repo: TripsRepository = {
      listHosted: async () => ({ items: [trip('past', '2020-01-01T10:00:00Z')], nextCursor: 'c2' }),
      listRsvps: emptyPage,
      listAttended: emptyPage,
    };
    expect(await makeLoadHostedUpcoming(repo)(null)).toEqual({ items: [], nextCursor: 'c2' });
  });

  it('reads going and requested from the RSVP list', async () => {
    const asked: string[] = [];
    const repo: TripsRepository = {
      listHosted: emptyPage,
      listRsvps: async (state, cursor, limit) => {
        asked.push(`${state}:${cursor}:${limit}`);
        return { items: [], nextCursor: null };
      },
      listAttended: emptyPage,
    };
    await makeLoadGoing(repo)(null);
    await makeLoadRequested(repo)('c2');
    expect(asked).toEqual(['going:null:20', 'requested:c2:20']);
  });
});

describe('merging Going and Hosting', () => {
  const going = [
    trip('g1', '2026-11-05T10:00:00Z', { role: 'going' }),
    trip('g2', '2026-11-12T10:00:00Z', { role: 'going' }),
  ];

  it('interleaves both lists soonest first, each post once with hosting kept', () => {
    const hosted = [trip('h1', '2026-11-08T10:00:00Z'), trip('g2', '2026-11-12T10:00:00Z')];
    const merged = mergeUpcoming(going, hosted, true);
    expect(ids(merged)).toEqual(['g1', 'h1', 'g2']);
    expect(merged.map((t) => t.role)).toEqual(['going', 'hosting', 'hosting']);
  });

  it('holds back a hosted post later than the going posts loaded so far', () => {
    const hosted = [trip('soon', '2026-11-08T10:00:00Z'), trip('later', '2026-12-20T10:00:00Z')];
    expect(ids(mergeUpcoming(going, hosted, false))).toEqual(['g1', 'soon', 'g2']);
    expect(ids(mergeUpcoming(going, hosted, true))).toEqual(['g1', 'soon', 'g2', 'later']);
  });

  it('shows every hosted post when I am going to nothing', () => {
    const hosted = [trip('h2', '2026-12-01T10:00:00Z'), trip('h1', '2026-11-08T10:00:00Z')];
    expect(ids(mergeUpcoming([], hosted, true))).toEqual(['h1', 'h2']);
  });
});
