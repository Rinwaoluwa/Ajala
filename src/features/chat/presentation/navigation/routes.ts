/** Where Messages lives in the route tree. */
export const chatRoutes = {
  list: '/(app)/messages',
  /** One conversation: `{ pathname: chatRoutes.thread, params: { id } }`. */
  thread: '/(app)/chat/[id]',
} as const;
