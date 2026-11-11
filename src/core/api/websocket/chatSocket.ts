import { io, type ManagerOptions, type SocketOptions } from 'socket.io-client';

import { apiConfig } from '../apiConfig';
import { socketOrigin } from './socketUrl';
import { flavourServers } from '../../config/flavour';

/**
 * The app's one live connection: the socket server's `/chat` namespace
 * (spec §2.20). It only listens; everything the person does is an HTTP call.
 * It carries `message.new`, `read.update`, `typing` and (perhaps, spec §8 Q5)
 * `rsvp.update`, plus two about the connection itself, `session.expiring` and
 * `server.restart`, which are handled here.
 *
 * Best effort by design. A missed event costs little because every screen
 * fetches again when it opens or comes back into focus, and after any reconnect
 * a `reconnected` event tells the chat to fetch the open thread and the list.
 *
 * - **Held, not opened.** Whoever needs live updates calls `hold()` and gets a
 *   release function back; the connection stays up while anyone holds it and
 *   closes when the last one lets go. One socket serves every screen, and
 *   signing out (which unmounts the holders) closes it.
 * - **The token** goes in the handshake's `auth.token`, and nowhere else (a
 *   header would be fixed when the socket is made, and stale 15 minutes later).
 *   `auth` is given as a function, which socket.io calls on every handshake, so
 *   each attempt (ours or socket.io's own after a lost signal) presents the
 *   token as it is then. That is the spec's "set `socket.auth.token`, then
 *   connect", done once for every attempt.
 * - **`session.expiring { inMs }`**: the server cuts the socket 60 s after the
 *   token expires. The token is renewed at once (well inside `inMs`) and the
 *   socket reconnects with it (`disconnect().connect()`).
 * - **`server.restart { reconnectInMs }`**: reconnect after that wait.
 * - **The server cutting us** (`io server disconnect`: signed out, token
 *   expired, a restart) is not retried by socket.io. It is retried here, after a
 *   short and growing wait, only while someone holds the socket and a token can
 *   still be had (that is, still signed in).
 * - **Refused connections** (`connect_error`, by `error.data.code`):
 *   `UNAUTHENTICATED` renews the token and tries again (twice at most in a row);
 *   `RATE_LIMITED` waits a minute; `SERVICE_UNAVAILABLE` retries after a few
 *   seconds, waiting longer each time; `SESSION_SOCKET_LIMIT` (this sign-in
 *   already holds three sockets) and `FORBIDDEN` (wrong host) stop, and say so
 *   in development. Stopped means stopped until the socket is next held afresh
 *   (sign in again, or relaunch), so a refusal never turns into a loop.
 * - **Listeners** are kept here, not on the socket, so they survive the socket
 *   being closed and made again.
 * - **Demo mode** has no server, so there is no socket: holding does nothing.
 */

export const CHAT_SOCKET_EVENTS = {
  messageNew: 'message.new',
  readUpdate: 'read.update',
  typing: 'typing',
  rsvpUpdate: 'rsvp.update',
  sessionExpiring: 'session.expiring',
  serverRestart: 'server.restart',
  /** Not from the server: connected again after a drop, so anything may have been missed. */
  reconnected: 'reconnected',
} as const;

export type SocketListener = (payload: unknown) => void;
/**
 * A current access token, or null when signed out. Given `refused` (a token the
 * server just turned away), it must hand back a different one, refreshing if it
 * has to.
 */
export type TokenSource = (refused?: string) => Promise<string | null>;

/** The part of a socket.io `Socket` used here, so tests can hand in a fake. */
export type SocketLike = {
  /** True while socket.io itself will keep trying to connect. */
  readonly active: boolean;
  readonly connected: boolean;
  on(event: 'connect', listener: () => void): unknown;
  on(event: 'disconnect', listener: (reason: string) => void): unknown;
  on(event: 'connect_error', listener: (error: Error & { data?: unknown }) => void): unknown;
  onAny(listener: (event: string, payload: unknown) => void): unknown;
  connect(): unknown;
  disconnect(): unknown;
};

export type Connect = (url: string, options: Partial<ManagerOptions & SocketOptions>) => SocketLike;

export type RealtimeConnection = {
  hold(getToken: TokenSource): () => void;
  on(event: string, listener: SocketListener): () => void;
};

/** Waits, in ms. Exported for the tests. */
export const SOCKET_WAITS = {
  rateLimited: 60_000,
  /** The first retry after SERVICE_UNAVAILABLE or a server cut; doubles each time up to `max`. */
  retryFirst: 3_000,
  retryMax: 60_000,
  /** A connection that stays up this long resets the growing waits. */
  settled: 60_000,
} as const;

/** UNAUTHENTICATED this many times in a row, even with a renewed token: stop. */
const MAX_UNAUTHENTICATED = 2;

function warn(what: string) {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  console.warn(`[chat socket] ${what}`);
}

const errorCode = (error: unknown): string | null => {
  const data = (error as { data?: { code?: unknown } } | null)?.data;
  return typeof data?.code === 'string' ? data.code : null;
};

const numberIn = (payload: unknown, key: string): number | null => {
  const value = (payload as Record<string, unknown> | null)?.[key];
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
};

export function createRealtimeConnection({
  url,
  enabled,
  connect = io,
}: {
  url: string;
  enabled: boolean;
  connect?: Connect;
}): RealtimeConnection {
  const listeners = new Map<string, Set<SocketListener>>();
  let socket: SocketLike | null = null;
  let opening = false;
  let holders = 0;
  let tokenSource: TokenSource | null = null;
  /** The token the last handshake presented: what UNAUTHENTICATED refused. */
  let lastSent: string | null = null;
  // One pending retry or planned reconnect at a time; a newer plan replaces it.
  let timer: ReturnType<typeof setTimeout> | null = null;
  let settledTimer: ReturnType<typeof setTimeout> | null = null;
  let restartPlanned = false;
  let failures = 0;
  let unauthenticated = 0;

  const deliver = (event: string, payload: unknown) => {
    for (const listener of listeners.get(event) ?? []) {
      // One listener throwing must not stop the others hearing the event.
      try {
        listener(payload);
      } catch {
        // Best effort.
      }
    }
  };

  const token = async (refused?: string) => {
    try {
      return (await tokenSource?.(refused)) ?? null;
    } catch {
      return null;
    }
  };

  const clearTimers = () => {
    if (timer) clearTimeout(timer);
    if (settledTimer) clearTimeout(settledTimer);
    timer = null;
    settledTimer = null;
    restartPlanned = false;
  };

  /** Runs `then` after `ms`, unless this socket has been closed or replaced by then. */
  const later = (s: SocketLike, ms: number, then: () => void | Promise<void>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (socket === s && holders > 0) void then();
    }, ms);
  };

  /** The next growing wait: 3 s, 6 s, 12 s… up to a minute. */
  const nextWait = () => {
    const ms = Math.min(SOCKET_WAITS.retryFirst * 2 ** failures, SOCKET_WAITS.retryMax);
    failures += 1;
    return ms;
  };

  /** Connects again with whatever token is current, if anyone still wants it and someone is signed in. */
  const reconnect = async (s: SocketLike, refused?: string) => {
    const t = await token(refused);
    if (!t || socket !== s || holders === 0) return;
    if (s.connected) s.disconnect();
    s.connect();
  };

  /** Gives up until the socket is next held afresh. */
  const stop = (s: SocketLike, why: string) => {
    warn(why);
    clearTimers();
    s.disconnect();
  };

  function wire(s: SocketLike) {
    let connectedBefore = false;

    s.on('connect', () => {
      unauthenticated = 0;
      restartPlanned = false;
      if (settledTimer) clearTimeout(settledTimer);
      settledTimer = setTimeout(() => {
        failures = 0;
      }, SOCKET_WAITS.settled);
      if (connectedBefore) deliver(CHAT_SOCKET_EVENTS.reconnected, undefined);
      connectedBefore = true;
    });

    s.on('disconnect', (reason) => {
      if (settledTimer) clearTimeout(settledTimer);
      // socket.io retries lost signals by itself, and a disconnect we asked for
      // needs nothing. Only the server's own cut is left to us.
      if (reason !== 'io server disconnect' || restartPlanned) return;
      later(s, nextWait(), () => reconnect(s));
    });

    s.on('connect_error', (error) => {
      const code = errorCode(error);
      switch (code) {
        case 'UNAUTHENTICATED': {
          unauthenticated += 1;
          if (unauthenticated > MAX_UNAUTHENTICATED) {
            stop(s, 'refused the token again after renewing it; stopping');
            return;
          }
          // Renew past the token it refused, then try again.
          later(s, 0, () => reconnect(s, lastSent ?? undefined));
          return;
        }
        case 'SESSION_SOCKET_LIMIT':
          stop(s, 'this sign-in already holds the most sockets the server allows; not retrying');
          return;
        case 'FORBIDDEN':
          stop(s, `refused by ${url} (wrong host?); not retrying`);
          return;
        case 'RATE_LIMITED':
          later(s, SOCKET_WAITS.rateLimited, () => reconnect(s));
          return;
        case 'SERVICE_UNAVAILABLE':
          later(s, nextWait(), () => reconnect(s));
          return;
        default:
          // A lost signal: socket.io is already retrying. Anything else that
          // left it idle gets the growing wait.
          if (!s.active) later(s, nextWait(), () => reconnect(s));
      }
    });

    s.onAny((event, payload) => {
      if (event === CHAT_SOCKET_EVENTS.sessionExpiring) {
        // Renewed at once rather than at the last moment: `inMs` is a deadline,
        // and renewing early only spends a refresh a little sooner. Handing the
        // old token back makes sure the new one really is new.
        later(s, 0, () => reconnect(s, lastSent ?? undefined));
      } else if (event === CHAT_SOCKET_EVENTS.serverRestart) {
        restartPlanned = true;
        later(s, numberIn(payload, 'reconnectInMs') ?? SOCKET_WAITS.retryFirst, () => reconnect(s));
      }
      deliver(event, payload);
    });
  }

  async function open() {
    opening = true;
    try {
      const first = await token();
      // Let go of, or signed out, while the token was being read: nothing to open.
      if (holders === 0 || !first || socket) return;
      let handshakeToken: string | null = first;
      const s = connect(url, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1_000,
        reconnectionDelayMax: 30_000,
        auth: (send: (data: object) => void) => {
          // The first handshake uses the token just read; every later one asks again.
          const ready = handshakeToken;
          handshakeToken = null;
          void (ready ? Promise.resolve(ready) : token()).then((t) => {
            lastSent = t;
            send({ token: t ?? '' });
          });
        },
      });
      wire(s);
      socket = s;
    } finally {
      opening = false;
    }
  }

  return {
    hold(getToken) {
      holders += 1;
      tokenSource = getToken;
      if (enabled && !socket && !opening) void open();
      let released = false;
      return () => {
        if (released) return;
        released = true;
        holders -= 1;
        if (holders > 0) return;
        clearTimers();
        failures = 0;
        unauthenticated = 0;
        socket?.disconnect();
        socket = null;
      };
    },
    on(event, listener) {
      const set = listeners.get(event) ?? new Set<SocketListener>();
      set.add(listener);
      listeners.set(event, set);
      return () => {
        set.delete(listener);
      };
    },
  };
}

/**
 * The `/chat` namespace on the socket host (`EXPO_PUBLIC_WS_URL`, or guessed
 * from the API's host; see `socketOrigin`).
 */
export const chatSocket = createRealtimeConnection({
  url: `${socketOrigin(flavourServers().ws ?? process.env.EXPO_PUBLIC_WS_URL, apiConfig.baseUrl)}/chat`,
  enabled: true,
});
