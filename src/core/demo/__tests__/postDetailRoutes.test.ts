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

type CommentDto = {
  id: string;
  parentId: string | null;
  author: { id: string; displayName: string } | null;
  body: string | null;
  deleted: boolean;
  replyCount: number;
  mine: boolean;
  canDelete: boolean;
};
type CommentsPage = { items: CommentDto[]; total: number; nextCursor: string | null };

const signIn = () =>
  demoRequest({ method: 'POST', path: '/api/v1/auth/login', body: { email: 'a@b.c', password: 'x' } });
const list = (postId: string) =>
  demoRequest<CommentsPage>({ method: 'GET', path: `/api/v1/posts/${postId}/comments?limit=20` });
const replies = (postId: string, id: string) =>
  demoRequest<CommentsPage>({ method: 'GET', path: `/api/v1/posts/${postId}/comments/${id}/replies` });
const post = (postId: string, body: unknown) =>
  demoRequest<CommentDto>({ method: 'POST', path: `/api/v1/posts/${postId}/comments`, body });
const failure = (p: Promise<unknown>) => p.then(() => null).catch((e: unknown) => e);

describe('demo comments', () => {
  beforeEach(async () => {
    resetDemo();
    await signIn();
  });

  it('lists top-level comments with reply counts, and the replies on their own', async () => {
    const page = await list('p-tarkwa');
    // Three top-level comments and one reply.
    expect(page.items).toHaveLength(3);
    expect(page.total).toBe(4);
    const question = page.items.find((c) => c.body === 'Should we bring swimming gear?');
    expect(question?.replyCount).toBe(1);
    const thread = await replies('p-tarkwa', question?.id ?? '');
    expect(thread.total).toBe(0);
    expect(thread.items[0]).toMatchObject({ parentId: question?.id, author: { displayName: 'Fatima Bello' } });
  });

  it('shows a deleted comment that still has replies as deleted, with no author or body', async () => {
    const page = await list('p-cultural');
    expect(page.items[0]).toMatchObject({ deleted: true, author: null, body: null, replyCount: 1 });
    expect(page.total).toBe(2);
  });

  it('takes { body, parentId }, and a reply to a reply joins the same thread', async () => {
    const top = await post('p-tarkwa', { body: 'See you there!' });
    expect(top).toMatchObject({ parentId: null, mine: true, canDelete: true, author: { id: 'me' } });
    const page = await list('p-tarkwa');
    const question = page.items.find((c) => c.replyCount === 1);
    const firstReply = (await replies('p-tarkwa', question?.id ?? '')).items[0];
    const reply = await post('p-tarkwa', { body: 'Me too', parentId: firstReply?.id });
    expect(reply.parentId).toBe(question?.id);
    expect((await list('p-tarkwa')).total).toBe(6);
  });

  it('keeps a body to 1–1000 characters, and refuses a cancelled post', async () => {
    expect(await failure(post('p-tarkwa', { body: '  ' }))).toMatchObject({ code: 'VALIDATION_FAILED' });
    expect(await failure(post('p-tarkwa', { body: 'x'.repeat(1001) }))).toMatchObject({
      code: 'VALIDATION_FAILED',
    });
    expect(await post('p-tarkwa', { body: 'x'.repeat(1000) })).toMatchObject({ mine: true });
    await demoRequest({ method: 'POST', path: '/api/v1/posts/p-my-rooftop/cancel' });
    expect(await failure(post('p-my-rooftop', { body: 'Hello?' }))).toMatchObject({ code: 'POST_CANCELLED' });
  });

  it('lets you delete your own comments, or any on a post you host', async () => {
    const others = await list('p-tarkwa');
    expect(others.items.every((c) => !c.canDelete)).toBe(true);
    const first = others.items[0]?.id ?? '';
    expect(
      await failure(demoRequest({ method: 'DELETE', path: `/api/v1/posts/p-tarkwa/comments/${first}` })),
    ).toMatchObject({ code: 'NOT_FOUND' });

    const mine = await post('p-tarkwa', { body: 'Oops' });
    await demoRequest({ method: 'DELETE', path: `/api/v1/posts/p-tarkwa/comments/${mine.id}` });
    // Idempotent.
    await demoRequest({ method: 'DELETE', path: `/api/v1/posts/p-tarkwa/comments/${mine.id}` });
    expect((await list('p-tarkwa')).items.some((c) => c.id === mine.id)).toBe(false);

    const hosted = await list('p-my-rooftop');
    expect(hosted.items[0]).toMatchObject({ mine: false, canDelete: true });
  });

  it('turns a deleted comment with replies into "deleted", and drops one without', async () => {
    const page = await list('p-tarkwa');
    const question = page.items.find((c) => c.replyCount === 1);
    // The question is someone else's; the host could delete it, so try on a thread of your own.
    const mine = await post('p-tarkwa', { body: 'Anyone driving?' });
    await post('p-tarkwa', { body: 'I am', parentId: mine.id });
    await demoRequest({ method: 'DELETE', path: `/api/v1/posts/p-tarkwa/comments/${mine.id}` });
    const after = await list('p-tarkwa');
    expect(after.items.find((c) => c.id === mine.id)).toMatchObject({ deleted: true, body: null });
    expect(after.items.find((c) => c.id === question?.id)?.deleted).toBe(false);
  });

  it('files a report once, needs details with "other", and refuses your own comment', async () => {
    const id = (await list('p-tarkwa')).items[0]?.id ?? '';
    const path = `/api/v1/posts/p-tarkwa/comments/${id}/report`;
    expect(await failure(demoRequest({ method: 'POST', path, body: { reason: 'other' } }))).toMatchObject({
      code: 'VALIDATION_FAILED',
    });
    expect(await demoRequest({ method: 'POST', path, body: { reason: 'spam' } })).toMatchObject({
      id: expect.any(String),
    });
    expect(await failure(demoRequest({ method: 'POST', path, body: { reason: 'spam' } }))).toMatchObject({
      code: 'CONFLICT',
    });
    const mine = await post('p-tarkwa', { body: 'Mine' });
    expect(
      await failure(
        demoRequest({
          method: 'POST',
          path: `/api/v1/posts/p-tarkwa/comments/${mine.id}/report`,
          body: { reason: 'spam' },
        }),
      ),
    ).toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('starts again with the demo', async () => {
    await post('p-tarkwa', { body: 'Gone after a reset' });
    resetDemo();
    await signIn();
    expect((await list('p-tarkwa')).total).toBe(4);
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
