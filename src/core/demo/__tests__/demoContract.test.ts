import { beforeEach, describe, expect, it } from '@jest/globals';

import { demoRequest, resetDemo } from '../demoApi';
import { store } from '../demoStore';

const LAGOS = { 'X-Client-Location': '6.430,3.420' };

type Card = {
  id: string;
  type: string;
  title: string;
  saved: boolean;
  startAt: string;
  costSplit: { perPersonCents: number } | null;
  price: { amountCents: number; currency: string; exponent: number } | null;
};
type Page = { items: Card[]; nextCursor: string | null };
type CityPage = Page & { city: { id: string; name: string }; citySource: string };

const form = (parts: [string, unknown][]) => ({ _parts: parts });
const photos: [string, unknown][] = [
  ['images', { uri: 'file:///a.jpg', name: 'a.jpg', type: 'image/jpeg' }],
  ['images', { uri: 'file:///b.jpg', name: 'b.jpg', type: 'image/jpeg' }],
];
const caught = (p: Promise<unknown>) => p.catch((e: unknown) => e);

const signIn = () =>
  demoRequest({ method: 'POST', path: '/api/v1/auth/login', body: { email: 'a@b.c', password: 'x' } });

describe('the demo API, new contract', () => {
  beforeEach(async () => {
    resetDemo();
    await signIn();
  });

  it('answers login with the token pair only', async () => {
    const pair = await demoRequest<Record<string, unknown>>({
      method: 'POST',
      path: '/api/v1/auth/login',
      body: { email: 'a@b.c', password: 'x' },
    });
    expect(Object.keys(pair).sort()).toEqual(['accessExpiresAt', 'accessToken', 'refreshToken', 'sessionId']);
  });

  it('trades any 6-digit reset code for a token, and refuses anything else', async () => {
    const ok = await demoRequest<{ token: string }>({
      method: 'POST',
      path: '/api/v1/auth/password/verify',
      body: { email: 'a@b.c', code: '123456' },
    });
    expect(ok.token).toEqual(expect.any(String));
    const bad = await caught(
      demoRequest({ method: 'POST', path: '/api/v1/auth/password/verify', body: { email: 'a@b.c', code: '12' } }),
    );
    expect(bad).toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
  });

  it('saves a post on every card, lists it newest first, and unsaves it', async () => {
    await demoRequest({ method: 'POST', path: '/api/v1/posts/p-suya/save' });
    const post = await demoRequest<Card>({ method: 'GET', path: '/api/v1/posts/p-suya' });
    expect(post.saved).toBe(true);
    const feed = await demoRequest<Page>({ method: 'GET', path: '/api/v1/feed?limit=50', headers: LAGOS });
    expect(feed.items.find((p) => p.id === 'p-suya')?.saved).toBe(true);

    const saved = await demoRequest<Page>({ method: 'GET', path: '/api/v1/me/saved' });
    expect(saved.items[0]?.id).toBe('p-suya');
    const meetups = await demoRequest<Page>({ method: 'GET', path: '/api/v1/me/saved?type=meetup' });
    expect(meetups.items.every((p) => p.type === 'meetup')).toBe(true);

    await demoRequest({ method: 'DELETE', path: '/api/v1/posts/p-suya/save' });
    const after = await demoRequest<Page>({ method: 'GET', path: '/api/v1/me/saved' });
    expect(after.items.map((p) => p.id)).not.toContain('p-suya');
    // Unsaving is always a 204, saved or not.
    await expect(demoRequest({ method: 'DELETE', path: '/api/v1/posts/p-suya/save' })).resolves.toBeUndefined();
  });

  it('refuses to save a draft', async () => {
    const draft = await demoRequest<{ id: string }>({
      method: 'POST',
      path: '/api/v1/posts',
      body: form([
        ['type', 'meetup'],
        ['title', 'Draft'],
      ]),
    });
    const error = await caught(demoRequest({ method: 'POST', path: `/api/v1/posts/${draft.id}/save` }));
    expect(error).toMatchObject({ status: 409 });
  });

  it('lists my RSVPs by state, soonest first', async () => {
    await demoRequest({ method: 'POST', path: '/api/v1/posts/p-coffee-chat/rsvp' });
    const going = await demoRequest<Page>({ method: 'GET', path: '/api/v1/me/rsvps' });
    expect(going.items.map((p) => p.id)).toContain('p-coffee-chat');
    const starts = going.items.map((p) => p.startAt);
    expect([...starts].sort()).toEqual(starts);

    const requested = await demoRequest<Page>({ method: 'GET', path: '/api/v1/me/rsvps?state=requested' });
    expect(requested.items.length).toBeGreaterThan(0);
    expect(requested.items.map((p) => p.id)).not.toContain('p-coffee-chat');
  });

  it('searches posts by words and by interests, best match first', async () => {
    const none = await caught(demoRequest({ method: 'GET', path: '/api/v1/search/posts', headers: LAGOS }));
    expect(none).toMatchObject({ code: 'VALIDATION_FAILED', status: 400 });

    const jazz = await demoRequest<CityPage>({
      method: 'GET',
      path: '/api/v1/search/posts?q=jazz&interestIds=music',
      headers: LAGOS,
    });
    expect(jazz.city.name).toBe('Lagos');
    // The title match comes before posts that only share the interest.
    expect(jazz.items[0]?.title).toBe('Jazz on the Terrace');
    expect(jazz.items.length).toBeGreaterThan(1);

    const repeated = await demoRequest<CityPage>({
      method: 'GET',
      path: '/api/v1/search/posts?interestIds=beach&interestIds=cycling',
      headers: LAGOS,
    });
    const commas = await demoRequest<CityPage>({
      method: 'GET',
      path: '/api/v1/search/posts?interestIds=beach,cycling',
      headers: LAGOS,
    });
    expect(repeated.items.map((p) => p.id).sort()).toEqual(commas.items.map((p) => p.id).sort());
    expect(repeated.items.length).toBe(2);
  });

  it('finds people by first name or handle, with or without the @', async () => {
    const byName = await demoRequest<{ items: { id: string }[] }>({
      method: 'GET',
      path: '/api/v1/search/people?q=kemi',
    });
    expect(byName.items.map((p) => p.id)).toContain('h-kemi');
    const byHandle = await demoRequest<{ items: { id: string; handle: string }[] }>({
      method: 'GET',
      path: '/api/v1/search/people?q=%40tolu.travels',
    });
    expect(byHandle.items[0]).toMatchObject({ id: 'h-tolu', handle: 'tolu.travels' });
  });

  it('teleports the feed, the map and search while Travel is on, and comes home', async () => {
    const sub = await demoRequest<{ subscribed: boolean }>({ method: 'GET', path: '/api/v1/me/subscription' });
    expect(sub.subscribed).toBe(true);

    await demoRequest({ method: 'POST', path: '/api/v1/me/teleport', body: { cityId: 'accra' } });
    const feed = await demoRequest<CityPage>({ method: 'GET', path: '/api/v1/feed', headers: LAGOS });
    expect(feed).toMatchObject({ city: { id: 'accra' }, citySource: 'teleport' });
    const pins = await demoRequest<{ citySource: string }>({
      method: 'GET',
      path: '/api/v1/map/pins?bbox=-1,5,0.5,6',
      headers: LAGOS,
    });
    expect(pins.citySource).toBe('teleport');
    const search = await demoRequest<CityPage>({
      method: 'GET',
      path: '/api/v1/search/posts?q=jazz',
      headers: LAGOS,
    });
    expect(search.citySource).toBe('teleport');

    await demoRequest({ method: 'DELETE', path: '/api/v1/me/teleport' });
    const home = await demoRequest<CityPage>({ method: 'GET', path: '/api/v1/feed', headers: LAGOS });
    expect(home).toMatchObject({ city: { id: 'lagos' }, citySource: 'device' });
  });

  it('filters map pins by title', async () => {
    const pins = await demoRequest<{ pins: { title: string }[] }>({
      method: 'GET',
      path: '/api/v1/map/pins?bbox=3.2,6.3,3.6,6.7&q=YOGA',
      headers: LAGOS,
    });
    expect(pins.pins.map((p) => p.title)).toEqual(['Sunset Yoga Circle']);
  });

  it('splits a plan’s cost, rounding up, and refuses type-only fields on the wrong type', async () => {
    const plan = await demoRequest<Card & { itinerary: string[] }>({
      method: 'POST',
      path: '/api/v1/posts',
      body: form([
        ['type', 'plan'],
        ['title', 'Boat day'],
        ['costTotalCents', '1000'],
        ['costCurrency', 'NGN'],
        ['expectedCount', '3'],
        ['itinerary', 'Jetty'],
        ['itinerary', 'Beach'],
        ...photos,
      ]),
    });
    expect(plan.costSplit?.perPersonCents).toBe(334);
    expect(plan.itinerary).toEqual(['Jetty', 'Beach']);

    const wrong = await caught(
      demoRequest({
        method: 'POST',
        path: '/api/v1/posts',
        body: form([
          ['type', 'meetup'],
          ['title', 'Coffee'],
          ['schedule', '9am Doors'],
        ]),
      }),
    );
    expect(wrong).toMatchObject({ code: 'VALIDATION_FAILED', fieldErrors: [{ field: 'schedule' }] });

    const edit = await caught(
      demoRequest({ method: 'PATCH', path: `/api/v1/posts/${plan.id}`, body: { recurrence: 'weekly' } }),
    );
    expect(edit).toMatchObject({ code: 'VALIDATION_FAILED', fieldErrors: [{ field: 'recurrence' }] });
  });

  it('stamps profile completion from name and date of birth, without gender', async () => {
    await demoRequest({
      method: 'POST',
      path: '/api/v1/auth/signup/email',
      body: { email: 'new@b.c', password: 'Passw0rd!', firstName: 'Ngozi', lastName: 'Eze', dob: '1998-01-01' },
    });
    const before = await demoRequest<{ profileCompletedAt: string | null }>({ method: 'GET', path: '/api/v1/me' });
    expect(before.profileCompletedAt).toBeNull();
    const after = await demoRequest<{ profileCompletedAt: string | null; gender: string | null }>({
      method: 'PATCH',
      path: '/api/v1/me',
      body: { handle: 'ngozi.e' },
    });
    expect(after.gender).toBeNull();
    expect(after.profileCompletedAt).not.toBeNull();
  });

  it('unlinks a provider unless it is the only way in', async () => {
    await demoRequest({ method: 'DELETE', path: '/api/v1/me/identities/google' });
    const me = await demoRequest<{ identities: { provider: string }[] }>({ method: 'GET', path: '/api/v1/me' });
    expect(me.identities).toEqual([{ provider: 'email' }]);
    const missing = await caught(demoRequest({ method: 'DELETE', path: '/api/v1/me/identities/google' }));
    expect(missing).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('keeps an inbox with an unread count, and marks it read', async () => {
    const inbox = await demoRequest<{ items: { id: string; category: string }[]; unreadCount: number }>({
      method: 'GET',
      path: '/api/v1/me/notifications',
    });
    expect(new Set(inbox.items.map((n) => n.category)).size).toBe(8);
    expect(inbox.unreadCount).toBeGreaterThan(0);
    const first = inbox.items[0]?.id ?? '';
    await demoRequest({ method: 'POST', path: '/api/v1/me/notifications/read', body: { ids: [first] } });
    const unread = await demoRequest<{ items: { id: string }[]; unreadCount: number }>({
      method: 'GET',
      path: '/api/v1/me/notifications?unread=true',
    });
    expect(unread.unreadCount).toBe(inbox.unreadCount - 1);
    expect(unread.items.map((n) => n.id)).not.toContain(first);
    await demoRequest({ method: 'POST', path: '/api/v1/me/notifications/read', body: {} });
    const none = await demoRequest<{ unreadCount: number }>({ method: 'GET', path: '/api/v1/me/notifications' });
    expect(none.unreadCount).toBe(0);
  });
});

describe('Travel ended', () => {
  beforeEach(async () => {
    resetDemo();
    await signIn();
  });

  it('refuses a web checkout while subscribed', async () => {
    const already = await caught(demoRequest({ method: 'POST', path: '/api/v1/me/subscription/checkout', body: {} }));
    expect(already).toMatchObject({ status: 409 });
  });

  it('asks for payment to teleport, and the feed stays where the phone is', async () => {
    await demoRequest({ method: 'POST', path: '/api/v1/me/teleport', body: { cityId: 'accra' } });
    store.endSubscription();
    const me = await demoRequest<{ subscribed: boolean; subscribedUntil: string | null }>({
      method: 'GET',
      path: '/api/v1/me',
    });
    expect(me).toMatchObject({ subscribed: false, subscribedUntil: null });
    const feed = await demoRequest<CityPage>({ method: 'GET', path: '/api/v1/feed', headers: LAGOS });
    expect(feed.citySource).toBe('device');
    const refused = await caught(
      demoRequest({ method: 'POST', path: '/api/v1/me/teleport', body: { cityId: 'accra' } }),
    );
    expect(refused).toMatchObject({ code: 'PAYMENT_REQUIRED', status: 402 });
    // Buying through the web turns it back on.
    const { url } = await demoRequest<{ url: string }>({
      method: 'POST',
      path: '/api/v1/me/subscription/checkout',
      body: {},
    });
    expect(url).toMatch(/^https:/);
    const sub = await demoRequest<{ subscribed: boolean; manage: string }>({
      method: 'POST',
      path: '/api/v1/me/subscription/checkout/confirm',
    });
    expect(sub).toMatchObject({ subscribed: true, manage: 'web' });
  });
});
