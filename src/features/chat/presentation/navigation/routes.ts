/** Where Messages lives in the route tree. */
export const chatRoutes = {
  list: '/(app)/messages',
  /** One conversation: `{ pathname: chatRoutes.thread, params: { id } }`. */
  thread: '/(app)/chat/[id]',
  /**
   * Opens a chat from anywhere else: `{ pathname: chatRoutes.start, params: { userId } }`
   * for a direct chat with someone, or `{ postId }` for a post's group chat. The
   * screen asks the API for the conversation (`POST /conversations`, which
   * answers the existing one when there is one) and replaces itself with the thread.
   */
  start: '/chat/start',
} as const;
