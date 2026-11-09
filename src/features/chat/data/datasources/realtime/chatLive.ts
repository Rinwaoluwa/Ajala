import { CHAT_SOCKET_EVENTS, type RealtimeConnection } from '@core/api/websocket/chatSocket';

import type { ChatEvent } from '../../../domain/entities/Chat';
import type { ChatLive } from '../../../domain/repositories/ChatRepository';
import { toChatEvent, toChatPushEvent } from '../../mappers/chatMappers';

const EVENTS = [
  CHAT_SOCKET_EVENTS.messageNew,
  CHAT_SOCKET_EVENTS.readUpdate,
  CHAT_SOCKET_EVENTS.typing,
  CHAT_SOCKET_EVENTS.rsvpUpdate,
  CHAT_SOCKET_EVENTS.reconnected,
] as const;

/** Pushes that arrive while the app is open, as their `data` (`@core/push`'s `onPushReceived`). */
export type PushSource = (listener: (data: Record<string, unknown>) => void) => () => void;

/**
 * The chat's side of the socket: the three chat events (and "connected again")
 * as domain events. Payloads it can't read are dropped; the next fetch catches
 * up. `rsvp.update` comes through too, as a plain "this post changed": the
 * socket is held here, and no other feature listens to it (spec §8 Q5 asks
 * whether the server still sends it; nothing breaks if it never does).
 * `session.expiring` and `server.restart` are the connection's own business
 * and stay in `@core/api/websocket`.
 *
 * Chat pushes heard while the app is open come through here too. They matter
 * when the socket is down (or in demo mode, which has none): they are what
 * moves the list and the Messages badge then. Other pushes belong to the
 * notifications feature and are ignored.
 */
export function createChatLive(connection: RealtimeConnection, pushes: PushSource): ChatLive {
  return {
    hold: (getToken) => connection.hold(getToken),
    subscribe(listener: (event: ChatEvent) => void) {
      const offs = EVENTS.map((name) =>
        connection.on(name, (payload) => {
          const event = toChatEvent(name, payload);
          if (event) listener(event);
        }),
      );
      offs.push(
        pushes((data) => {
          const event = toChatPushEvent(data);
          if (event) listener(event);
        }),
      );
      return () => offs.forEach((off) => off());
    },
  };
}
