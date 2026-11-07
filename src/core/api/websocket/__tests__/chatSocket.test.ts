import { describe, expect, it, jest } from '@jest/globals';

import { CHAT_SOCKET_EVENTS, createRealtimeConnection, type Connect } from '../chatSocket';

/** A stand-in for socket.io: records what was asked of it and lets a test play the server. */
function fakeServer() {
  const sockets: {
    url: string;
    options: Record<string, unknown>;
    connect: () => void;
    emit: (event: string, payload: unknown) => void;
    disconnected: boolean;
  }[] = [];
  const connect: Connect = (url, options) => {
    let onConnect = () => undefined as unknown;
    let onAny: (event: string, payload: unknown) => void = () => undefined;
    const record = {
      url,
      options: options as Record<string, unknown>,
      connect: () => void onConnect(),
      emit: (event: string, payload: unknown) => onAny(event, payload),
      disconnected: false,
    };
    sockets.push(record);
    return {
      on: (_event, listener) => {
        onConnect = listener;
      },
      onAny: (listener) => {
        onAny = listener;
      },
      disconnect: () => {
        record.disconnected = true;
      },
    };
  };
  return { sockets, connect };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('the chat socket', () => {
  it('opens one connection for every holder, with the bearer token, and closes after the last', async () => {
    const server = fakeServer();
    const conn = createRealtimeConnection({ url: 'https://api/chat', enabled: true, connect: server.connect });
    const releaseA = conn.hold(async () => 'token-1');
    const releaseB = conn.hold(async () => 'token-1');
    await flush();
    expect(server.sockets).toHaveLength(1);
    expect(server.sockets[0]?.url).toBe('https://api/chat');
    expect(server.sockets[0]?.options.extraHeaders).toEqual({ Authorization: 'Bearer token-1' });
    releaseA();
    releaseA();
    expect(server.sockets[0]?.disconnected).toBe(false);
    releaseB();
    expect(server.sockets[0]?.disconnected).toBe(true);
  });

  it('asks for the token again on every connection attempt', async () => {
    const server = fakeServer();
    const conn = createRealtimeConnection({ url: 'u', enabled: true, connect: server.connect });
    let token = 'old';
    conn.hold(async () => token);
    await flush();
    token = 'new';
    const auth = server.sockets[0]?.options.auth as (send: (data: object) => void) => void;
    const send = jest.fn();
    auth(send);
    await flush();
    expect(send).toHaveBeenCalledWith({ token: 'new' });
  });

  it('delivers events to listeners, and says when it connected again', async () => {
    const server = fakeServer();
    const conn = createRealtimeConnection({ url: 'u', enabled: true, connect: server.connect });
    const heard: unknown[] = [];
    conn.on(CHAT_SOCKET_EVENTS.messageNew, (p) => heard.push(p));
    conn.on(CHAT_SOCKET_EVENTS.reconnected, () => heard.push('again'));
    conn.hold(async () => 't');
    await flush();
    const socket = server.sockets[0]!;
    socket.connect();
    socket.emit('message.new', { id: '1' });
    socket.connect();
    expect(heard).toEqual([{ id: '1' }, 'again']);
  });

  it('does nothing when switched off (demo mode) or signed out', async () => {
    const server = fakeServer();
    createRealtimeConnection({ url: 'u', enabled: false, connect: server.connect }).hold(async () => 't');
    createRealtimeConnection({ url: 'u', enabled: true, connect: server.connect }).hold(async () => null);
    await flush();
    expect(server.sockets).toHaveLength(0);
  });
});
