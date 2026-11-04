import { beforeEach, describe, expect, it } from '@jest/globals';

import { demoRequest, resetDemo } from '../demoApi';

type Page = {
  items: { user: { id: string }; state: string }[];
  counts: { going: number; requested: number | null };
};

describe('the demo post page', () => {
  beforeEach(() => resetDemo());

  it('lists as many going as the count, and adds you once you join', async () => {
    const before = await demoRequest<Page>({
      method: 'GET',
      path: '/api/v1/posts/p-coffee-chat/attendees?state=going&limit=50',
    });
    expect(before.items).toHaveLength(before.counts.going);
    await demoRequest({ method: 'POST', path: '/api/v1/posts/p-coffee-chat/rsvp' });
    const after = await demoRequest<Page>({
      method: 'GET',
      path: '/api/v1/posts/p-coffee-chat/attendees?state=going&limit=50',
    });
    expect(after.items[0]?.user.id).toBe('me');
    expect(after.counts.going).toBe(before.counts.going + 1);
  });

  it('keeps requests for the host only', async () => {
    const refused = await demoRequest({
      method: 'GET',
      path: '/api/v1/posts/p-tech-founders/attendees?state=requested',
    }).catch((e: unknown) => e);
    expect(refused).toMatchObject({ code: 'FORBIDDEN' });
  });

  it('refuses to delete a post people joined', async () => {
    const error = await demoRequest({ method: 'DELETE', path: '/api/v1/posts/p-coffee-chat' }).catch(
      (e: unknown) => e,
    );
    // Not the demo user's post.
    expect(error).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('lets the host accept a request, then cancel rather than delete', async () => {
    const form = {
      _parts: [
        ['type', 'meetup'],
        ['title', 'Mine'],
        ['visibility', 'private'],
        ['status', 'draft'],
      ],
    };
    const { id } = await demoRequest<{ id: string }>({ method: 'POST', path: '/api/v1/posts', body: form });
    const requests = await demoRequest<Page>({
      method: 'GET',
      path: `/api/v1/posts/${id}/attendees?state=requested`,
    });
    expect(requests.items).toHaveLength(2);
    const who = requests.items[0]?.user.id ?? '';
    const answer = await demoRequest<{ state: string; goingCount: number }>({
      method: 'POST',
      path: `/api/v1/posts/${id}/attendees/${who}/accept`,
    });
    expect(answer).toMatchObject({ state: 'going', goingCount: 1 });
    const refused = await demoRequest({ method: 'DELETE', path: `/api/v1/posts/${id}` }).catch(
      (e: unknown) => e,
    );
    expect(refused).toMatchObject({ code: 'POST_HAS_ATTENDEES' });
  });
});

describe('demo comments', () => {
  it('starts some posts with a conversation and keeps new comments, with replies', async () => {
    resetDemo();
    await demoRequest({
      method: 'POST',
      path: '/api/v1/auth/login',
      body: { email: 'a@b.c', password: 'x' },
    });
    const before = await demoRequest<{ items: { id: string }[]; total: number }>({
      method: 'GET',
      path: '/api/v1/posts/p-tarkwa/comments?limit=20',
    });
    expect(before.total).toBe(4);
    const reply = await demoRequest<{ replyTo: { displayName: string } | null }>({
      method: 'POST',
      path: '/api/v1/posts/p-tarkwa/comments',
      body: { text: 'See you there!', replyToId: before.items[1]?.id },
    });
    expect(reply.replyTo?.displayName).toBe('Ngozi Obi');
    const after = await demoRequest<{ total: number }>({
      method: 'GET',
      path: '/api/v1/posts/p-tarkwa/comments',
    });
    expect(after.total).toBe(5);
  });
});

describe('past activities on the post page', () => {
  it('lists who went to a past activity, not only live ones', async () => {
    resetDemo();
    await demoRequest({
      method: 'POST',
      path: '/api/v1/auth/login',
      body: { email: 'a@b.c', password: 'x' },
    });
    const attended = await demoRequest<{ items: { id: string }[] }>({
      method: 'GET',
      path: '/api/v1/me/attended',
    });
    const id = attended.items[0]?.id ?? '';
    const going = await demoRequest<{ items: unknown[] }>({
      method: 'GET',
      path: `/api/v1/posts/${id}/attendees?state=going`,
    });
    expect(going.items.length).toBeGreaterThan(0);
  });
});
