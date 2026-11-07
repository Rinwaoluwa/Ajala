import { CHAT_SOCKET_EVENTS, type RealtimeConnection } from '@core/api/websocket/chatSocket';

import type { ChatEvent } from '../../../domain/entities/Chat';
import type { ChatLive } from '../../../domain/repositories/ChatRepository';
import { toChatEvent } from '../../mappers/chatMappers';

const EVENTS = [
  CHAT_SOCKET_EVENTS.messageNew,
  CHAT_SOCKET_EVENTS.readUpdate,
  CHAT_SOCKET_EVENTS.typing,
  CHAT_SOCKET_EVENTS.reconnected,
] as const;

/**
 * The chat's side of the socket: the three chat events (and "connected again")
 * as domain events. Payloads it can't read are dropped; the next fetch catches
 * up. `rsvp.update` is left to whichever feature owns RSVPs.
 */
export function createChatLive(connection: RealtimeConnection): ChatLive {
  return {
    hold: (getToken) => connection.hold(getToken),
    subscribe(listener: (event: ChatEvent) => void) {
      const offs = EVENTS.map((name) =>
        connection.on(name, (payload) => {
          const event = toChatEvent(name, payload);
          if (event) listener(event);
        }),
      );
      return () => offs.forEach((off) => off());
    },
  };
}
