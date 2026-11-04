import { beforeEach, describe, expect, it } from '@jest/globals';

import { demoRequest, resetDemo } from '../demoApi';

const LAGOS = { 'X-Client-Location': '6.430,3.420' };

type Page = { items: { id: string; type: string }[]; city: { name: string }; nextCursor: string | null };

/** A multipart body the way React Native's FormData keeps it. */
const form = (parts: [string, unknown][]) => ({ _parts: parts });

describe('the demo API', () => {
  beforeEach(() => resetDemo());

  it('signs anyone in to a finished profile', async () => {
    const session = await demoRequest<{ accessToken: string }>({
      method: 'POST',
      path: '/api/v1/auth/login',
      body: { email: 'tester@example.com', password: 'x' },
    });
    expect(session.accessToken).toMatch(/^demo-access/);
    const me = await demoRequest<{ email: string; profileCompletedAt: string | null }>({
      method: 'GET',
      path: '/api/v1/me',
    });
    expect(me).toMatchObject({ email: 'tester@example.com' });
    expect(me.profileCompletedAt).not.toBeNull();
  });

  it('signs in with Apple, using the name and the email in its token', async () => {
    const claims = Buffer.from(JSON.stringify({ email: 'ada@privaterelay.appleid.com' })).toString('base64url');
    await demoRequest({
      method: 'POST',
      path: '/api/v1/auth/oauth/apple',
      body: { identityToken: `h.${claims}.s`, authorizationCode: 'c', nonce: 'n', firstName: 'Ada', lastName: 'Bello' },
    });
    const me = await demoRequest<{ email: string; firstName: string; lastName: string }>({
      method: 'GET',
      path: '/api/v1/me',
    });
    expect(me).toMatchObject({ email: 'ada@privaterelay.appleid.com', firstName: 'Ada', lastName: 'Bello' });
  });

  it('serves the Lagos feed by type, soonest first', async () => {
    const all = await demoRequest<Page>({
      method: 'GET',
      path: '/api/v1/feed?type=all&limit=20',
      headers: LAGOS,
    });
    expect(all.city.name).toBe('Lagos');
    expect(all.items.length).toBeGreaterThan(5);
    const events = await demoRequest<Page>({
      method: 'GET',
      path: '/api/v1/feed?type=event&limit=20',
      headers: LAGOS,
    });
    expect(events.items.every((p) => p.type === 'event')).toBe(true);
  });

  it('shows a published post on the map, and keeps a draft off it', async () => {
    const start = new Date(Date.now() + 3 * 86_400_000).toISOString();
    const base: [string, unknown][] = [
      ['type', 'meetup'],
      ['title', 'Demo meetup'],
      ['description', 'Testing'],
      ['startAt', start],
      ['lat', '6.44'],
      ['lng', '3.47'],
      ['interestIds', 'food'],
      ['images', { uri: 'file:///a.jpg', name: 'a.jpg', type: 'image/jpeg' }],
      ['images', { uri: 'file:///b.jpg', name: 'b.jpg', type: 'image/jpeg' }],
    ];
    const live = await demoRequest<{ id: string }>({
      method: 'POST',
      path: '/api/v1/posts',
      body: form([...base, ['status', 'published']]),
    });
    await demoRequest({
      method: 'POST',
      path: '/api/v1/posts',
      body: form([...base, ['title', 'Draft'], ['status', 'draft']]),
    });

    const map = await demoRequest<{ pins: { id: string; title: string }[] }>({
      method: 'GET',
      path: '/api/v1/map/pins?bbox=3.2,6.3,3.6,6.7',
      headers: LAGOS,
    });
    expect(map.pins.map((p) => p.id)).toContain(live.id);
    expect(map.pins.map((p) => p.title)).not.toContain('Draft');
  });

  it('refuses to publish without the rules met, naming each', async () => {
    const error = await demoRequest({
      method: 'POST',
      path: '/api/v1/posts',
      body: form([
        ['type', 'event'],
        ['title', 'Bare'],
        ['status', 'published'],
      ]),
    }).catch((e: unknown) => e);
    expect(error).toMatchObject({ code: 'VALIDATION_FAILED' });
    expect((error as { fieldErrors: unknown[] }).fieldErrors.length).toBeGreaterThan(2);
  });

  it('runs the RSVP states: going, requested, full', async () => {
    const going = await demoRequest<{ state: string }>({
      method: 'POST',
      path: '/api/v1/posts/p-coffee-chat/rsvp',
    });
    expect(going.state).toBe('going');
    const requested = await demoRequest<{ state: string }>({
      method: 'POST',
      path: '/api/v1/posts/p-tech-founders/rsvp',
    });
    expect(requested.state).toBe('requested');
    const full = await demoRequest({ method: 'POST', path: '/api/v1/posts/p-afrobeats/rsvp' }).catch(
      (e: unknown) => e,
    );
    expect(full).toMatchObject({ code: 'POST_FULL' });
    const waitlisted = await demoRequest<{ state: string }>({
      method: 'POST',
      path: '/api/v1/posts/p-yoga/rsvp',
    });
    expect(waitlisted.state).toBe('waitlisted');
  });

  it('takes one report per post', async () => {
    await demoRequest({ method: 'POST', path: '/api/v1/posts/p-suya/report', body: { reason: 'spam' } });
    const again = await demoRequest({
      method: 'POST',
      path: '/api/v1/posts/p-suya/report',
      body: { reason: 'spam' },
    }).catch((e: unknown) => e);
    expect(again).toMatchObject({ code: 'CONFLICT' });
  });

  it('says plainly when a route has no demo answer', async () => {
    await expect(demoRequest({ method: 'GET', path: '/api/v1/nowhere' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

describe('the demo world across areas', () => {
  beforeEach(() => resetDemo());

  it('opens a past activity on the post page, though it is off the feed', async () => {
    await demoRequest({
      method: 'POST',
      path: '/api/v1/auth/login',
      body: { email: 'a@b.c', password: 'x' },
    });
    const attended = await demoRequest<{ items: { id: string }[] }>({
      method: 'GET',
      path: '/api/v1/me/attended',
    });
    const first = attended.items[0];
    expect(first).toBeDefined();
    const post = await demoRequest<{ id: string }>({ method: 'GET', path: `/api/v1/posts/${first?.id}` });
    expect(post.id).toBe(first?.id);
  });

  it('keeps a bio edit', async () => {
    await demoRequest({
      method: 'POST',
      path: '/api/v1/auth/login',
      body: { email: 'a@b.c', password: 'x' },
    });
    const me = await demoRequest<{ bio: string | null }>({
      method: 'PATCH',
      path: '/api/v1/me',
      body: { bio: 'Always up for a sunrise hike.' },
    });
    expect(me.bio).toBe('Always up for a sunrise hike.');
  });
});
