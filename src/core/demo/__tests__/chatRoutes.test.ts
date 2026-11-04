import { beforeEach, describe, expect, it } from '@jest/globals';

import { demoRequest, resetDemo } from '../demoApi';
import { resetChatDemo } from '../routes/chat';

type Thread = {
  id: string;
  kind: string;
  title: string;
  unreadCount: number;
  lastMessage: { text: string; fromMe: boolean } | null;
  post: { id: string } | null;
};
type Page<T> = { items: T[]; nextCursor: string | null };
type Message = { id: string; text: string; fromMe: boolean };

const get = <T>(path: string) => demoRequest<T>({ method: 'GET', path });

describe('the demo chats', () => {
  beforeEach(() => {
    resetDemo();
    resetChatDemo();
  });

  it('lists the conversations, latest first', async () => {
    const page = await get<Page<Thread>>('/api/v1/chats?filter=all&limit=20');
    expect(page.items.map((t) => t.title)).toEqual([
      'Lagos Weekend Crew',
      'Maya Chen',
      'Accra Food Trail',
      'Chioma Obi',
      'Cape Town Explorers',
      'Art Lagos Meetup',
    ]);
    expect(page.items[0]).toMatchObject({ unreadCount: 5, post: { id: 'p-tarkwa' } });
  });

  it('filters by unread and groups, and pages', async () => {
    const unread = await get<Page<Thread>>('/api/v1/chats?filter=unread');
    expect(unread.items.every((t) => t.unreadCount > 0)).toBe(true);
    expect(unread.items).toHaveLength(3);
    const groups = await get<Page<Thread>>('/api/v1/chats?filter=groups');
    expect(groups.items.every((t) => t.kind === 'group')).toBe(true);
    const first = await get<Page<Thread>>('/api/v1/chats?limit=4');
    expect(first.nextCursor).toBe('4');
  });

  it('searches the name and the last message', async () => {
    const byTitle = await get<Page<Thread>>('/api/v1/chats?q=maya');
    expect(byTitle.items.map((t) => t.title)).toEqual(['Maya Chen']);
    const byText = await get<Page<Thread>>('/api/v1/chats?q=photos');
    expect(byText.items.map((t) => t.title)).toEqual(['Chioma Obi']);
    const none = await get<Page<Thread>>('/api/v1/chats?q=zzz');
    expect(none.items).toEqual([]);
  });

  it('keeps what you send and moves the chat to the top', async () => {
    const sent = await demoRequest<Message>({
      method: 'POST',
      path: '/api/v1/chats/c-art-lagos/messages',
      body: { text: '  See you next time  ' },
    });
    expect(sent).toMatchObject({ text: 'See you next time', fromMe: true });
    const messages = await get<Page<Message>>('/api/v1/chats/c-art-lagos/messages');
    expect(messages.items[0]?.id).toBe(sent.id);
    const list = await get<Page<Thread>>('/api/v1/chats');
    expect(list.items[0]).toMatchObject({ id: 'c-art-lagos', lastMessage: { fromMe: true } });
  });

  it('refuses an empty message and an unknown chat', async () => {
    await expect(
      demoRequest({ method: 'POST', path: '/api/v1/chats/c-maya/messages', body: { text: ' ' } }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    await expect(get('/api/v1/chats/nope')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('marks a conversation read', async () => {
    await demoRequest({ method: 'POST', path: '/api/v1/chats/c-maya/read' });
    const thread = await get<Thread>('/api/v1/chats/c-maya');
    expect(thread.unreadCount).toBe(0);
  });
});
