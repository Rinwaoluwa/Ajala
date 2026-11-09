/**
 * Public API of the `chat` feature: the Messages list, a conversation, the
 * screen that opens a chat from elsewhere, the live connection, and the count
 * of conversations with anything unread (Home's Messages badge).
 *
 * `ChatRealtime` holds the `/chat` socket while it is mounted. The chat screens
 * hold it themselves; mounting it once in the signed-in layout keeps it up for
 * the whole session, so new messages reach the list before Messages is opened.
 */

export { MessagesScreen, type MessagesScreenProps } from './presentation/screens/MessagesScreen';
export { ChatScreen, type ChatScreenProps } from './presentation/screens/ChatScreen';
export { StartChatScreen, type StartChatScreenProps } from './presentation/screens/StartChatScreen';
export { ChatRealtime } from './presentation/hooks/useChatRealtime';
export { useUnreadChatsCount } from './presentation/hooks/useUnreadChatsCount';
export { chatRoutes } from './presentation/navigation/routes';
