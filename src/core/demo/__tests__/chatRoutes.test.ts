import { beforeEach, describe, expect, it } from '@jest/globals';

import { demoRequest, resetDemo } from '../demoApi';
import { rememberPerson } from '../demoStore';
import { resetChatDemo } from '../routes/chat';

type Conversation = {
  id: string;
  kind: string;
  title: string | null;
  postId: string | null;
  other: { id: string; displayName: string } | null;
  unreadCount: number;
  lastMessage: { id: string; senderId: string; preview: string | null; imageCount: number } | null;
};
type Detail = Conversation & {
  onlineCount: number;
  members: { user: { id: string }; role: string; online: boolean; lastReadMessageId: string | null }[];
};
type Message = {
  id: string;
  clientMsgId: string;
  body: string | null;
  mine: boolean;
  removed: boolean;
  images: unknown[];
  taggedPost: { id: string } | null;
  taggedPostUnavailable: boolean;
};
type Page<T> = { items: T[]; nextCursor: string | null };

const get = <T>(path: string) => demoRequest<T>({ method: 'GET', path });
const post = <T>(path: string, body?: unknown) => demoRequest<T>({ method: 'POST', path, body });
/** A multipart body as React Native's FormData holds it. */
const multipart = (fields: [string, unknown][]) => ({ _parts: fields });
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const C = '/api/v1/conversations';

describe('the demo chat', () => {
  beforeEach(() => {
    resetDemo();
    resetChatDemo();
  });

  it('lists the conversations, latest activity first', async () => {
    const page = await get<Page<Conversation>>(`${C}?tab=all&limit=20`);
    expect(page.items.map((c) => c.title ?? c.other?.displayName)).toEqual([
      'Lagos Weekend Crew',
      'Maya Chen',
      'Accra Food Trail',
      'Chioma Obi',
      'Cape Town Explorers',
      'Art Lagos Meetup',
    ]);
    expect(page.items[0]).toMatchObject({ unreadCount: 5, postId: 'p-tarkwa', kind: 'group' });
    // 64-bit-sized ids, as strings.
    expect(page.items[0]?.lastMessage?.id).toMatch(/^\d{19}$/);
  });

  it('filters by tab, searches, and pages', async () => {
    const unread = await get<Page<Conversation>>(`${C}?tab=unread`);
    expect(unread.items.every((c) => c.unreadCount > 0)).toBe(true);
    expect(unread.items).toHaveLength(3);
    const groups = await get<Page<Conversation>>(`${C}?tab=groups`);
    expect(groups.items.every((c) => c.kind === 'group')).toBe(true);
    expect((await get<Page<Conversation>>(`${C}?search=maya`)).items).toHaveLength(1);
    expect((await get<Page<Conversation>>(`${C}?search=photos`)).items[0]?.other?.displayName).toBe('Chioma Obi');
    expect((await get<Page<Conversation>>(`${C}?limit=4`)).nextCursor).toBe('4');
    await expect(get(`${C}?search=${'x'.repeat(61)}`)).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('opens a conversation with its members, host first, and how far each has read', async () => {
    const detail = await get<Detail>(`${C}/c-lagos-crew`);
    expect(detail.members[0]?.role).toBe('owner');
    expect(detail.members.some((m) => m.user.id === 'me')).toBe(true);
    expect(detail.onlineCount).toBeGreaterThan(0);
    const maya = await get<Detail>(`${C}/c-maya`);
    expect(maya.members.find((m) => m.user.id === 'u-maya')?.lastReadMessageId).toBe(maya.lastMessage?.id);
  });

  it('pages messages newest first, with `before` as the cursor', async () => {
    const first = await get<Page<Message>>(`${C}/c-lagos-crew/messages?limit=3`);
    expect(first.items).toHaveLength(3);
    expect(first.nextCursor).toBe(first.items[2]?.id);
    const rest = await get<Page<Message>>(`${C}/c-lagos-crew/messages?limit=3&before=${first.nextCursor}`);
    expect(rest.items[0]!.id < first.items[2]!.id).toBe(true);
    const all = [...first.items, ...rest.items];
    expect(all.some((m) => m.removed && m.body === null)).toBe(true);
    expect(all.some((m) => m.images.length === 2)).toBe(true);
  });

  it('shows a tagged post, or that it is no longer available', async () => {
    const maya = await get<Page<Message>>(`${C}/c-maya/messages`);
    expect(maya.items.some((m) => m.taggedPost?.id === 'p-lekki-market')).toBe(true);
    const accra = await get<Page<Message>>(`${C}/c-accra-food/messages`);
    expect(accra.items[0]).toMatchObject({ taggedPost: null, taggedPostUnavailable: true });
  });

  it('sends multipart, once per clientMsgId, and moves the chat to the top', async () => {
    const path = `${C}/c-art-lagos/messages`;
    const body = multipart([
      ['clientMsgId', uuid(1)],
      ['body', '  See you next time  '],
      ['images', { uri: 'file:///a.jpg', name: 'a.jpg', type: 'image/jpeg' }],
    ]);
    const sent = await post<Message>(path, body);
    expect(sent).toMatchObject({ body: 'See you next time', mine: true, clientMsgId: uuid(1) });
    expect(sent.images).toHaveLength(1);
    const again = await post<Message>(path, body);
    expect(again.id).toBe(sent.id);
    const messages = await get<Page<Message>>(path);
    expect(messages.items.filter((m) => m.clientMsgId === uuid(1))).toHaveLength(1);
    const list = await get<Page<Conversation>>(C);
    expect(list.items[0]).toMatchObject({ id: 'c-art-lagos', lastMessage: { senderId: 'me', imageCount: 1 } });
  });

  it('refuses a send without a uuid or with nothing in it', async () => {
    const path = `${C}/c-maya/messages`;
    await expect(post(path, multipart([['body', 'hi']]))).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    await expect(post(path, multipart([['clientMsgId', uuid(2)], ['body', ' ']]))).rejects.toMatchObject({
      status: 400,
    });
    await expect(get(`${C}/nope`)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('marks read up to a message, never back', async () => {
    const messages = await get<Page<Message>>(`${C}/c-maya/messages`);
    const newest = messages.items[0]!.id;
    const older = messages.items[3]!.id;
    await post(`${C}/c-maya/read`, { messageId: newest });
    await post(`${C}/c-maya/read`, { messageId: older });
    const detail = await get<Detail>(`${C}/c-maya`);
    expect(detail.unreadCount).toBe(0);
    expect(detail.members.find((m) => m.user.id === 'me')?.lastReadMessageId).toBe(newest);
  });

  it('starts a direct chat once per person, and refuses as the API does', async () => {
    const started = await post<Detail>(C, { userId: 'h-tolu' });
    expect(started).toMatchObject({ kind: 'direct', other: { id: 'h-tolu' } });
    expect((await post<Detail>(C, { userId: 'h-tolu' })).id).toBe(started.id);
    expect((await post<Detail>(C, { userId: 'u-maya' })).id).toBe('c-maya');
    await expect(post(C, { userId: 'h-james' })).rejects.toMatchObject({ status: 403 });
    await expect(post(C, { userId: 'me' })).rejects.toMatchObject({ status: 409 });
    await expect(post(C, {})).rejects.toMatchObject({ status: 400 });
    await expect(post(C, { userId: 'h-tolu', postId: 'p-tarkwa' })).rejects.toMatchObject({ status: 400 });
  });

  it('caps new direct chats per day', async () => {
    const people = ['h-tolu', 'h-kemi', 'u-sam', 'u-tunde', 'u-amara', 'u-kofi'];
    for (const userId of people) await post(C, { userId });
    // Six started; the demo's limit is ten, so make up the rest with remembered travellers.
    for (let i = 0; i < 4; i++) {
      rememberPerson({ id: `u-extra-${i}`, displayName: `Extra ${i}`, avatarUrl: null });
      await post(C, { userId: `u-extra-${i}` });
    }
    rememberPerson({ id: 'u-extra-x', displayName: 'One too many', avatarUrl: null });
    await expect(post(C, { userId: 'u-extra-x' })).rejects.toMatchObject({ code: 'CHAT_START_LIMIT', status: 429 });
  }, 20_000);

  it('makes a post’s group chat for its host only', async () => {
    const group = await post<Detail>(C, { postId: 'p-my-rooftop' });
    expect(group).toMatchObject({ kind: 'group', postId: 'p-my-rooftop' });
    expect(group.members[0]).toMatchObject({ user: { id: 'me' }, role: 'owner' });
    expect((await post<Detail>(C, { postId: 'p-my-rooftop' })).id).toBe(group.id);
    await expect(post(C, { postId: 'p-jazz' })).rejects.toMatchObject({ status: 403 });
  });

  it('adds and removes members; the host can’t leave, a member can', async () => {
    const group = await post<Detail>(C, { postId: 'p-my-rooftop' });
    await post(`${C}/${group.id}/members`, { userId: 'u-tunde' });
    expect((await get<Detail>(`${C}/${group.id}`)).members.some((m) => m.user.id === 'u-tunde')).toBe(true);
    await demoRequest({ method: 'DELETE', path: `${C}/${group.id}/members/u-tunde` });
    await expect(demoRequest({ method: 'DELETE', path: `${C}/${group.id}/members/me` })).rejects.toMatchObject({
      status: 409,
    });
    await expect(post(`${C}/c-lagos-crew/members`, { userId: 'u-tunde' })).rejects.toMatchObject({ status: 403 });
    await demoRequest({ method: 'DELETE', path: `${C}/c-lagos-crew/members/me` });
    await expect(get(`${C}/c-lagos-crew`)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('takes typing and reports, once per message', async () => {
    await post(`${C}/c-maya/typing`);
    const [theirs] = (await get<Page<Message>>(`${C}/c-maya/messages`)).items;
    const path = `${C}/c-maya/messages/${theirs!.id}/report`;
    await expect(post(path, { reason: 'other' })).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    expect(await post(path, { reason: 'spam' })).toMatchObject({ id: expect.any(String) });
    await expect(post(path, { reason: 'spam' })).rejects.toMatchObject({ status: 409 });
  });
});
