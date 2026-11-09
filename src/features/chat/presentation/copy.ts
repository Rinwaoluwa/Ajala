import type { ChatErrorCode } from '../domain/entities/ChatError';

/** Messages' words, from the Figma frames (Messages, Chat 1:1, Chat group, Safety tips). */
export const chatCopy = {
  title: 'Messages',
  back: 'Back',
  search: 'Search messages',
  filters: [
    { value: 'all', label: 'All' },
    { value: 'unread', label: 'Unread' },
    { value: 'groups', label: 'Groups' },
  ] as const,
  you: 'You',
  /** A group the API gave no title. */
  groupFallback: 'Group chat',
  /** The list's last line for pictures without words. */
  photos: (n: number) => (n === 1 ? 'Photo' : `${n} photos`),
  unread: (n: number) => `${n} unread`,
  empty: {
    title: 'No messages yet',
    body: 'Your conversations will appear here once you start chatting with someone.',
    action: 'Explore plans',
  },
  noResults: {
    title: 'No conversations found',
    body: (q: string) => `We couldn’t find a conversation for “${q}”. Try another name or group.`,
    action: 'Clear search',
  },
  noUnread: { title: 'You’re all caught up', body: 'Unread conversations will show here.' },
  noGroups: { title: 'No group chats yet', body: 'Join a group activity to chat with everyone going.' },
  loadFailed: 'Couldn’t load your messages.',
  retry: 'Try again',
  loading: 'Loading messages',
  start: {
    title: 'Message',
    groupTitle: 'Group chat',
    opening: 'Opening the chat',
    back: 'Go back',
    noTarget: 'Open a chat from someone’s profile or from an activity.',
    /** You're going, but the group chat's 100 places are taken: you're next in line. */
    full: {
      title: 'The group chat is full right now',
      body: 'You’ll be added when a place opens.',
    },
  },
  /** A chat that answered 404: left, removed, or its activity was cancelled. */
  gone: {
    title: 'This chat isn’t available',
    body: 'You may have left it or been removed, or the activity was cancelled.',
    action: 'Go back',
  },
  thread: {
    online: 'Online',
    group: (members: number, online: number) => `${members} members · ${online} online`,
    typing: (names: readonly string[], group: boolean) =>
      !group || names.length === 0
        ? 'typing…'
        : names.length === 1
          ? `${names[0]?.split(' ')[0]} is typing…`
          : 'Several people are typing…',
    today: 'Today',
    yesterday: 'Yesterday',
    sent: 'Sent',
    read: 'Read',
    sending: 'Sending…',
    placeholder: 'Message...',
    send: 'Send message',
    safety: 'Safety tips',
    empty: {
      title: 'Say hello',
      body: 'Messages you send here are only seen by people in this conversation.',
    },
    loadFailed: 'Couldn’t load this conversation.',
    openPost: (title: string) => `Open ${title}`,
    removed: 'This message was removed',
    postUnavailable: 'This activity is no longer available',
    photo: (n: number, of: number) => `Photo ${n} of ${of}`,
    attach: 'Add photos',
    removePhoto: (n: number) => `Remove photo ${n}`,
    report: 'Report message',
  },
  banner: {
    title: 'Keep chats on Ajala',
    link: 'Click here for safety tips',
    close: 'Hide this reminder',
  },
  report: {
    title: 'Report message',
    intro: 'Tell us what’s wrong. The sender won’t know it was you.',
    reasons: {
      harassment: 'Harassment',
      impersonation: 'Pretending to be someone else',
      spam: 'Spam or scam',
      inappropriate_content: 'Inappropriate content',
      other: 'Something else',
    },
    detailsLabel: 'Anything to add? (optional)',
    detailsRequired: 'Tell us what happened',
    placeholder: 'A few words help us look into it',
    cancel: 'Cancel',
    submit: 'Submit report',
    doneTitle: 'Report sent',
    done: 'Thanks. We’ll look into it.',
  },
  tips: {
    title: 'Safety tips',
    body: 'Stay safe while chatting and making plans.',
    items: [
      {
        title: 'Keep chats on Ajala',
        body: 'Get to know someone here before sharing other contact details.',
      },
      {
        title: 'Protect your personal details',
        body: 'Keep your address, passwords, and verification codes private.',
      },
      {
        title: 'Be cautious with money',
        body: 'Never send money or payment details to someone you haven’t verified.',
      },
      {
        title: 'Meet in a public place',
        body: 'Tell someone you trust your plans and arrange your own transport.',
      },
      {
        title: 'Trust your instincts',
        body: 'You can leave any chat. Block or report anyone who makes you feel unsafe.',
      },
    ],
    action: 'Got it',
  },
};

export const chatErrorMessages: Record<ChatErrorCode, string> = {
  invalid: 'Write something or add a photo (up to 2,000 characters and 4 photos).',
  notAllowed: 'This person can’t be messaged any more.',
  dmRestricted: 'They only take messages from people they share a post with.',
  startLimit: 'You’ve started a lot of new chats today; try again tomorrow.',
  conflict: 'This chat can’t be opened.',
  groupChatFull: 'The group chat is full right now. You’ll be added when a place opens.',
  notFound: 'This chat isn’t available.',
  tooLarge: 'Each photo must be 5 MB or smaller.',
  unsupportedImage: 'Use a JPEG, PNG or WebP photo.',
  reportingPaused: 'Reporting is paused on your account; you can still block.',
  alreadyReported: 'You’ve already reported this message.',
  rateLimited: 'You’re going a little fast. Wait a moment and try again.',
  network: 'You seem to be offline. Check your connection and try again.',
  sessionExpired: 'Your session ended. Sign in again to continue.',
  unknown: 'Something went wrong. Try again.',
};

/** What the start screen says when a chat can't be opened. `calm`: not a failure, just a wait. */
export type StartProblem = { title: string; body?: string; calm?: boolean };

/**
 * Opening a chat. A person's refusals are about them (their message settings,
 * yourself, today's limit). A post's group chat is made by the API for
 * everyone going, so the only answers are "full, you're in line" (calm) and
 * "not there for you": you left or were removed, or the activity was cancelled.
 */
export const startProblem = (code: ChatErrorCode, forPost: boolean): StartProblem => {
  if (forPost && code === 'groupChatFull') return { ...chatCopy.start.full, calm: true };
  if (forPost && (code === 'notFound' || code === 'notAllowed' || code === 'dmRestricted')) {
    return { title: chatCopy.gone.title, body: chatCopy.gone.body };
  }
  if (code === 'conflict') {
    return { title: forPost ? chatErrorMessages.conflict : 'You can’t start a chat with this person.' };
  }
  if (code === 'notAllowed' || code === 'dmRestricted') return { title: chatErrorMessages.dmRestricted };
  if (code === 'notFound') return { title: 'This person isn’t available.' };
  if (code === 'invalid') return { title: chatCopy.start.noTarget };
  return { title: chatErrorMessages[code] };
};
