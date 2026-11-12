import { describe, expect, it } from '@jest/globals';

import type { ActivityPage, ProfileActivity } from '../entities/PublicProfile';
import type { ProfileViewRepository } from '../repositories/ProfileViewRepository';
import { makeLoadMyRsvps } from '../usecases/ProfileViewUseCases';

const activity = (id: string): ProfileActivity => ({
  id,
  type: 'plan',
  title: id,
  imageUrl: null,
  startAt: '2026-11-20T10:00:00Z',
  placeName: null,
  locality: null,
  goingCount: 0,
  capacity: null,
  interests: [],
  photoCount: 0,
  host: { id: 'h', name: 'Host', avatarUrl: null },
  distanceKm: null,
  saved: false,
  lockReason: null,
});

/** Answers `/me/rsvps` from `pages[state][cursor ?? 'first']`, and records what was asked. */
function rsvpRepo(pages: Record<string, Record<string, { ids: string[]; next: string | null }>>) {
  const asked: string[] = [];
  const repo = {
    getMyRsvps: async (state: string, cursor: string | null): Promise<ActivityPage> => {
      asked.push(`${state}:${cursor}`);
      const page = pages[state]?.[cursor ?? 'first'] ?? { ids: [], next: null };
      return { items: page.ids.map(activity), nextCursor: page.next };
    },
  } as unknown as ProfileViewRepository;
  return { repo, asked };
}

const tagged = (page: { items: { activity: ProfileActivity; state: string }[] }) =>
  page.items.map((i) => `${i.activity.id}:${i.state}`);

describe('the own profile’s Going / Requested tabs', () => {
  it('reads Going on its own', async () => {
    const { repo, asked } = rsvpRepo({ going: { first: { ids: ['g1'], next: null } } });
    const page = await makeLoadMyRsvps(repo)('going', null);
    expect(tagged(page)).toEqual(['g1:going']);
    expect(page.nextCursor).toBeNull();
    expect(asked).toEqual(['going:null']);
  });

  it('lists requests, then waitlists, each tagged by its list (as on Trips)', async () => {
    const { repo, asked } = rsvpRepo({
      requested: { first: { ids: ['r1'], next: null } },
      waitlisted: { first: { ids: ['w1'], next: 'w2' }, w2: { ids: ['w2'], next: null } },
    });
    const load = makeLoadMyRsvps(repo);
    const first = await load('requested', null);
    expect(tagged(first)).toEqual(['r1:requested', 'w1:waitlisted']);
    expect(first.nextCursor).toEqual({ state: 'waitlisted', cursor: 'w2' });
    const second = await load('requested', first.nextCursor);
    expect(tagged(second)).toEqual(['w2:waitlisted']);
    expect(second.nextCursor).toBeNull();
    expect(asked).toEqual(['requested:null', 'waitlisted:null', 'waitlisted:w2']);
  });
});
