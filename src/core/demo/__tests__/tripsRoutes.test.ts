import { beforeEach, describe, expect, it } from '@jest/globals';

import { demoRequest, resetDemo } from '../demoApi';

type Page = { items: { id: string; status?: string; startAt: string }[]; nextCursor: string | null };

const form = (parts: [string, unknown][]) => ({ _parts: parts });

describe('the demo Trips answers', () => {
  beforeEach(() => resetDemo());

  it('lists only my posts, by status, newest first', async () => {
    const start = new Date(Date.now() + 3 * 86_400_000).toISOString();
    const base: [string, unknown][] = [
      ['type', 'meetup'],
      ['description', 'Testing'],
      ['startAt', start],
      ['lat', '6.44'],
      ['lng', '3.47'],
      ['interestIds', 'food'],
      ['images', { uri: 'file:///a.jpg', name: 'a.jpg', type: 'image/jpeg' }],
      ['images', { uri: 'file:///b.jpg', name: 'b.jpg', type: 'image/jpeg' }],
    ];
    const first = await demoRequest<{ id: string }>({
      method: 'POST',
      path: '/api/v1/posts',
      body: form([...base, ['title', 'First'], ['status', 'published']]),
    });
    const second = await demoRequest<{ id: string }>({
      method: 'POST',
      path: '/api/v1/posts',
      body: form([...base, ['title', 'Second'], ['status', 'published']]),
    });
    const draft = await demoRequest<{ id: string }>({
      method: 'POST',
      path: '/api/v1/posts',
      body: form([
        ['type', 'plan'],
        ['title', 'Unfinished'],
        ['status', 'draft'],
      ]),
    });

    const published = await demoRequest<Page>({
      method: 'GET',
      path: '/api/v1/me/posts?status=published&limit=20',
    });
    // Newest first; the demo's own hosted post (p-my-rooftop) was there before these.
    expect(published.items.map((p) => p.id)).toEqual([second.id, first.id, 'p-my-rooftop']);
    expect(published.items.every((p) => p.status === 'published')).toBe(true);

    const drafts = await demoRequest<Page>({ method: 'GET', path: '/api/v1/me/posts?status=draft&limit=20' });
    expect(drafts.items.map((p) => p.id)).toEqual([draft.id]);
  });

  it('lists past posts I went to, kept off the map', async () => {
    const attended = await demoRequest<Page>({ method: 'GET', path: '/api/v1/me/attended?limit=20' });
    expect(attended.items.length).toBeGreaterThan(2);
    expect(attended.items.every((p) => new Date(p.startAt).getTime() < Date.now())).toBe(true);

    const map = await demoRequest<{ pins: { id: string }[] }>({
      method: 'GET',
      path: '/api/v1/map/pins?bbox=3.2,6.3,3.6,6.7',
      headers: { 'X-Client-Location': '6.430,3.420' },
    });
    const ids = new Set(attended.items.map((p) => p.id));
    expect(map.pins.some((p) => ids.has(p.id))).toBe(false);
  });
});
