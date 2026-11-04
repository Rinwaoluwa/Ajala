import { beforeEach, describe, expect, it } from '@jest/globals';

import { demoRequest, resetDemo } from '../demoApi';

describe('the demo profiles', () => {
  beforeEach(() => resetDemo());

  it('shows a host with their posts and history', async () => {
    const person = await demoRequest<{ displayName: string; handle: string }>({
      method: 'GET',
      path: '/api/v1/users/h-tolu',
    });
    expect(person).toMatchObject({ displayName: 'Tolu A.', handle: 'tolu.travels' });
    const posts = await demoRequest<{ items: unknown[] }>({
      method: 'GET',
      path: '/api/v1/users/h-tolu/posts?limit=20',
    });
    expect(posts.items.length).toBeGreaterThan(0);
    const attended = await demoRequest<{ items: { id: string }[] }>({
      method: 'GET',
      path: '/api/v1/users/h-tolu/attended?limit=20',
    });
    expect(attended.items.length).toBe(6);
  });

  it('opens a profile for someone going to a post and for a commenter', async () => {
    const posts = await demoRequest<{ items: { id: string }[] }>({ method: 'GET', path: '/api/v1/feed' });
    const postId = posts.items[0]?.id ?? '';
    const going = await demoRequest<{ items: { user: { id: string; displayName: string } }[] }>({
      method: 'GET',
      path: `/api/v1/posts/${postId}/attendees?state=going`,
    });
    const someone = going.items[0]?.user;
    expect(someone).toBeDefined();
    const profile = await demoRequest<{ id: string; displayName: string }>({
      method: 'GET',
      path: `/api/v1/users/${someone?.id}`,
    });
    expect(profile).toMatchObject({ id: someone?.id, displayName: someone?.displayName });
    const commenter = await demoRequest<{ displayName: string }>({
      method: 'GET',
      path: '/api/v1/users/u-ngozi',
    });
    expect(commenter.displayName).toBe('Ngozi Obi');
  });

  it('blocks and unblocks, listing the blocked', async () => {
    await demoRequest({ method: 'POST', path: '/api/v1/users/h-james/block' });
    const blocks = await demoRequest<{ items: { id: string; blockedByMe: boolean }[] }>({
      method: 'GET',
      path: '/api/v1/me/blocks',
    });
    expect(blocks.items.map((b) => b.id)).toContain('h-james');
    await demoRequest({ method: 'DELETE', path: '/api/v1/users/h-james/block' });
    const after = await demoRequest<{ blockedByMe: boolean }>({
      method: 'GET',
      path: '/api/v1/users/h-james',
    });
    expect(after.blockedByMe).toBe(false);
  });

  it('takes one report per person and 404s someone unknown', async () => {
    await demoRequest({ method: 'POST', path: '/api/v1/users/h-kemi/report', body: { reason: 'spam' } });
    await expect(
      demoRequest({ method: 'POST', path: '/api/v1/users/h-kemi/report', body: { reason: 'spam' } }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(demoRequest({ method: 'GET', path: '/api/v1/users/nobody' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});
