import { io, type ManagerOptions, type SocketOptions } from 'socket.io-client';

import { DEMO_MODE } from '../../demo/demoMode';
import { apiConfig } from '../apiConfig';

/**
 * The app's one live connection: the API's socket.io `/chat` namespace
 * (spec §2.18, §7.6). It carries `message.new`, `read.update`, `typing` and
 * `rsvp.update`.
 *
 * Best effort by design. A missed event costs nothing because every screen
 * fetches again when it opens or comes back into focus, so nothing here queues,
 * acknowledges or replays.
 *
 * - **Held, not opened.** Whoever needs live updates calls `hold()` and gets a
 *   release function back; the connection stays up while anyone holds it and
 *   closes when the last one lets go. That way one socket serves every screen,
 *   and signing out (which unmounts the holders) closes it.
 * - **The token** is asked for on every connection attempt rather than once,
 *   so a reconnect after the 15-minute access token rotated can present a
 *   fresh one. It goes in the handshake's `auth.token` and, for servers that
 *   read headers, as `Authorization: Bearer` (fixed when the socket is made).
 * - **Listeners** are kept here, not on the socket, so they survive the socket
 *   being closed and made again.
 * - **Demo mode** has no server, so there is no socket: holding does nothing.
 */

export const CHAT_SOCKET_EVENTS = {
  messageNew: 'message.new',
  readUpdate: 'read.update',
  typing: 'typing',
  rsvpUpdate: 'rsvp.update',
  /** Not from the server: connected again after a drop, so anything may have been missed. */
  reconnected: 'reconnected',
} as const;

export type SocketListener = (payload: unknown) => void;
export type TokenSource = () => Promise<string | null>;

/** The part of a socket.io `Socket` used here, so tests can hand in a fake. */
export type SocketLike = {
  on(event: 'connect', listener: () => void): unknown;
  onAny(listener: (event: string, payload: unknown) => void): unknown;
  disconnect(): unknown;
};

export type Connect = (url: string, options: Partial<ManagerOptions & SocketOptions>) => SocketLike;

export type RealtimeConnection = {
  hold(getToken: TokenSource): () => void;
  on(event: string, listener: SocketListener): () => void;
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

  const token = async () => {
    try {
      return (await tokenSource?.()) ?? null;
    } catch {
      return null;
    }
  };

  async function open() {
    opening = true;
    try {
      const first = await token();
      // Let go of, or signed out, while the token was being read: nothing to open.
      if (holders === 0 || !first || socket) return;
      let connectedBefore = false;
      const s = connect(url, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1_000,
        reconnectionDelayMax: 30_000,
        auth: (send: (data: object) => void) => {
          void token().then((t) => send({ token: t ?? '' }));
        },
        extraHeaders: { Authorization: `Bearer ${first}` },
      });
      s.on('connect', () => {
        if (connectedBefore) deliver(CHAT_SOCKET_EVENTS.reconnected, undefined);
        connectedBefore = true;
      });
      s.onAny((event, payload) => deliver(event, payload));
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

/** The `/chat` namespace on the API's host. Off in demo mode, which has no server. */
export const chatSocket = createRealtimeConnection({
  url: `${apiConfig.baseUrl}/chat`,
  enabled: !DEMO_MODE,
});
