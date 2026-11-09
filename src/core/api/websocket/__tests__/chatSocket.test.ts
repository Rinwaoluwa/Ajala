import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { CHAT_SOCKET_EVENTS, SOCKET_WAITS, createRealtimeConnection, type Connect } from '../chatSocket';
import { socketOrigin } from '../socketUrl';

type FakeSocket = {
  url: string;
  options: Record<string, unknown>;
  active: boolean;
  connected: boolean;
  connects: number;
  disconnects: number;
  /** Plays the server: runs the handshake's `auth` and reports the token it sent. */
  handshake: () => Promise<string>;
  fire: (event: string, ...args: unknown[]) => void;
  emit: (event: string, payload: unknown) => void;
};

/** A stand-in for socket.io: records what was asked of it and lets a test play the server. */
function fakeServer() {
  const sockets: FakeSocket[] = [];
  const connect: Connect = (url, options) => {
    const handlers = new Map<string, (...args: unknown[]) => void>();
    let onAny: (event: string, payload: unknown) => void = () => undefined;
    const record: FakeSocket = {
      url,
      options: options as Record<string, unknown>,
      active: true,
      connected: false,
      connects: 0,
      disconnects: 0,
      handshake: () =>
        new Promise((resolve) => {
          const auth = options.auth as (send: (data: { token: string }) => void) => void;
          auth((data) => resolve(data.token));
        }),
      fire: (event, ...args) => {
        if (event === 'connect') record.connected = true;
        if (event === 'disconnect') record.connected = false;
        handlers.get(event)?.(...args);
      },
      emit: (event, payload) => onAny(event, payload),
    };
    sockets.push(record);
    const socket = {
      get active() {
        return record.active;
      },
      get connected() {
        return record.connected;
      },
      on: (event: string, listener: (...args: never[]) => void) => {
        handlers.set(event, listener as (...args: unknown[]) => void);
      },
      onAny: (listener: (event: string, payload: unknown) => void) => {
        onAny = listener;
      },
      connect: () => {
        record.connects += 1;
      },
      disconnect: () => {
        record.disconnects += 1;
        record.connected = false;
      },
    };
    return socket as unknown as ReturnType<Connect>;
  };
  return { sockets, connect };
}

const flush = async () => {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
};

const refused = (code: string) => Object.assign(new Error(code), { data: { code } });

/** A token source that renews when handed back the token it last gave. */
function tokens() {
  let n = 1;
  const asked: (string | undefined)[] = [];
  const source = async (refusedToken?: string) => {
    asked.push(refusedToken);
    if (refusedToken === `t${n}`) n += 1;
    return `t${n}`;
  };
  return { source, asked };
}

// Fake timers throughout, so no planned retry outlives a test.
beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('the socket host', () => {
  it('uses EXPO_PUBLIC_WS_URL when set, without a trailing slash or /chat', () => {
    expect(socketOrigin('https://dev-ws.ajalatrvl.com/', 'https://dev-api.ajalatrvl.com')).toBe(
      'https://dev-ws.ajalatrvl.com',
    );
    expect(socketOrigin(' https://ws.example.com/chat ', 'x')).toBe('https://ws.example.com');
  });

  it('otherwise swaps the "api" host label for "ws"', () => {
    expect(socketOrigin(undefined, 'https://dev-api.ajalatrvl.com')).toBe('https://dev-ws.ajalatrvl.com');
    expect(socketOrigin('', 'https://api.ajalatrvl.com')).toBe('https://ws.ajalatrvl.com');
    expect(socketOrigin(undefined, 'https://api-staging.ajalatrvl.com')).toBe('https://ws-staging.ajalatrvl.com');
    expect(socketOrigin(undefined, 'http://localhost:3000')).toBe('http://localhost:3000');
  });
});

describe('the chat socket', () => {
  it('opens one connection for every holder, with the token in auth only, and closes after the last', async () => {
    const server = fakeServer();
    const conn = createRealtimeConnection({ url: 'https://ws/chat', enabled: true, connect: server.connect });
    const releaseA = conn.hold(async () => 'token-1');
    const releaseB = conn.hold(async () => 'token-1');
    await flush();
    expect(server.sockets).toHaveLength(1);
    const socket = server.sockets[0]!;
    expect(socket.url).toBe('https://ws/chat');
    expect(socket.options.transports).toEqual(['websocket']);
    expect(socket.options.extraHeaders).toBeUndefined();
    await expect(socket.handshake()).resolves.toBe('token-1');
    releaseA();
    releaseA();
    expect(socket.disconnects).toBe(0);
    releaseB();
    expect(socket.disconnects).toBe(1);
  });

  it('asks for the token again on every later handshake', async () => {
    const server = fakeServer();
    const conn = createRealtimeConnection({ url: 'u', enabled: true, connect: server.connect });
    let token = 'old';
    conn.hold(async () => token);
    await flush();
    const socket = server.sockets[0]!;
    await expect(socket.handshake()).resolves.toBe('old');
    token = 'new';
    await expect(socket.handshake()).resolves.toBe('new');
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
    socket.fire('connect');
    socket.emit('message.new', { id: '1' });
    socket.fire('connect');
    expect(heard).toEqual([{ id: '1' }, 'again']);
  });

  it('renews the token and reconnects when the session is expiring', async () => {
    const server = fakeServer();
    const conn = createRealtimeConnection({ url: 'u', enabled: true, connect: server.connect });
    const t = tokens();
    conn.hold(t.source);
    await flush();
    const socket = server.sockets[0]!;
    await socket.handshake();
    socket.fire('connect');
    socket.emit('session.expiring', { inMs: 120_000 });
    jest.advanceTimersByTime(0);
    await flush();
    // The token the socket used was handed back, so a new one was made.
    expect(t.asked).toContain('t1');
    expect(socket.disconnects).toBe(1);
    expect(socket.connects).toBe(1);
    await expect(socket.handshake()).resolves.toBe('t2');
  });

  it('reconnects after the wait a server restart asks for, not before', async () => {
    const server = fakeServer();
    const conn = createRealtimeConnection({ url: 'u', enabled: true, connect: server.connect });
    conn.hold(async () => 't');
    await flush();
    const socket = server.sockets[0]!;
    socket.fire('connect');
    socket.emit('server.restart', { reconnectInMs: 5_000 });
    socket.fire('disconnect', 'io server disconnect');
    jest.advanceTimersByTime(4_999);
    await flush();
    expect(socket.connects).toBe(0);
    jest.advanceTimersByTime(1);
    await flush();
    expect(socket.connects).toBe(1);
  });

  it('reconnects after the server cuts it only while still signed in', async () => {
    const server = fakeServer();
    const conn = createRealtimeConnection({ url: 'u', enabled: true, connect: server.connect });
    let signedIn = true;
    conn.hold(async () => (signedIn ? 't' : null));
    await flush();
    const socket = server.sockets[0]!;
    socket.fire('connect');
    socket.fire('disconnect', 'io server disconnect');
    jest.advanceTimersByTime(SOCKET_WAITS.retryFirst);
    await flush();
    expect(socket.connects).toBe(1);

    signedIn = false;
    socket.fire('connect');
    socket.fire('disconnect', 'io server disconnect');
    jest.advanceTimersByTime(SOCKET_WAITS.retryMax);
    await flush();
    expect(socket.connects).toBe(1);
  });

  it('leaves a lost signal to socket.io', async () => {
    const server = fakeServer();
    const conn = createRealtimeConnection({ url: 'u', enabled: true, connect: server.connect });
    conn.hold(async () => 't');
    await flush();
    const socket = server.sockets[0]!;
    socket.fire('connect');
    socket.fire('disconnect', 'transport close');
    socket.fire('connect_error', new Error('websocket error'));
    jest.advanceTimersByTime(SOCKET_WAITS.retryMax);
    await flush();
    expect(socket.connects).toBe(0);
  });

  describe('refused connections', () => {
    it('UNAUTHENTICATED: renews the refused token and tries again, then gives up', async () => {
      const server = fakeServer();
      const conn = createRealtimeConnection({ url: 'u', enabled: true, connect: server.connect });
      const t = tokens();
      conn.hold(t.source);
      await flush();
      const socket = server.sockets[0]!;
      socket.active = false;
      await socket.handshake();
        socket.fire('connect_error', refused('UNAUTHENTICATED'));
      jest.advanceTimersByTime(0);
      await flush();
      expect(t.asked).toContain('t1');
      expect(socket.connects).toBe(1);
      await expect(socket.handshake()).resolves.toBe('t2');

      socket.fire('connect_error', refused('UNAUTHENTICATED'));
      jest.advanceTimersByTime(0);
      await flush();
      expect(socket.connects).toBe(2);
      socket.fire('connect_error', refused('UNAUTHENTICATED'));
      jest.advanceTimersByTime(SOCKET_WAITS.retryMax);
      await flush();
      expect(socket.connects).toBe(2);
    });

    it('RATE_LIMITED: waits a minute', async () => {
      const server = fakeServer();
      const conn = createRealtimeConnection({ url: 'u', enabled: true, connect: server.connect });
      conn.hold(async () => 't');
      await flush();
      const socket = server.sockets[0]!;
      socket.active = false;
        socket.fire('connect_error', refused('RATE_LIMITED'));
      jest.advanceTimersByTime(SOCKET_WAITS.rateLimited - 1);
      await flush();
      expect(socket.connects).toBe(0);
      jest.advanceTimersByTime(1);
      await flush();
      expect(socket.connects).toBe(1);
    });

    it('SERVICE_UNAVAILABLE: retries after a few seconds, then longer', async () => {
      const server = fakeServer();
      const conn = createRealtimeConnection({ url: 'u', enabled: true, connect: server.connect });
      conn.hold(async () => 't');
      await flush();
      const socket = server.sockets[0]!;
      socket.active = false;
        socket.fire('connect_error', refused('SERVICE_UNAVAILABLE'));
      jest.advanceTimersByTime(SOCKET_WAITS.retryFirst);
      await flush();
      expect(socket.connects).toBe(1);
      socket.fire('connect_error', refused('SERVICE_UNAVAILABLE'));
      jest.advanceTimersByTime(SOCKET_WAITS.retryFirst);
      await flush();
      expect(socket.connects).toBe(1);
      jest.advanceTimersByTime(SOCKET_WAITS.retryFirst);
      await flush();
      expect(socket.connects).toBe(2);
    });

    it.each(['FORBIDDEN', 'SESSION_SOCKET_LIMIT'])('%s: stops, with no retry loop', async (code) => {
      const server = fakeServer();
      const conn = createRealtimeConnection({ url: 'u', enabled: true, connect: server.connect });
      conn.hold(async () => 't');
      await flush();
      const socket = server.sockets[0]!;
      socket.active = false;
        socket.fire('connect_error', refused(code));
      jest.advanceTimersByTime(SOCKET_WAITS.retryMax * 5);
      await flush();
      expect(socket.connects).toBe(0);
      expect(socket.disconnects).toBe(1);
    });
  });

  it('cancels a planned retry when the last holder lets go', async () => {
    const server = fakeServer();
    const conn = createRealtimeConnection({ url: 'u', enabled: true, connect: server.connect });
    const release = conn.hold(async () => 't');
    await flush();
    const socket = server.sockets[0]!;
    socket.active = false;
    socket.fire('connect_error', refused('RATE_LIMITED'));
    release();
    jest.advanceTimersByTime(SOCKET_WAITS.rateLimited);
    await flush();
    expect(socket.connects).toBe(0);
  });

  it('does nothing when switched off (demo mode) or signed out', async () => {
    const server = fakeServer();
    createRealtimeConnection({ url: 'u', enabled: false, connect: server.connect }).hold(async () => 't');
    createRealtimeConnection({ url: 'u', enabled: true, connect: server.connect }).hold(async () => null);
    await flush();
    expect(server.sockets).toHaveLength(0);
  });
});
