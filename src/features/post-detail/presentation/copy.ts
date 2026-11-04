import type { PostDetailErrorCode } from '../domain/entities/PostDetailError';
import type { PostType } from '../domain/entities/PostDetail';

/** The post page's words (Figma post detail frames). */

export const TYPE_LABEL: Record<PostType, string> = {
  meetup: 'Meetup',
  event: 'Event',
  plan: 'Plan',
  group: 'Group',
};

const NOUN: Record<PostType, string> = {
  meetup: 'meetup',
  event: 'event',
  plan: 'plan',
  group: 'group',
};

export const postCopy = {
  back: 'Back',
  more: 'More options',
  hostedBy: 'Hosted by',
  dateTime: 'Date & Time',
  location: 'Location',
  openInMaps: 'Opens in Maps',
  price: 'Price',
  free: 'Free',
  joined: 'Joined',
  spotsLeft: (left: number, of: number) => `${left} of ${of} spots left`,
  noLimit: 'No limit',
  share: 'Share',
  shareMessage: (title: string, link: string) => `${title} on Ajala\n${link}`,
  button: {
    join: (type: PostType) => `Join ${NOUN[type]}`,
    request: 'Request to join',
    joinWaitlist: 'Join the waiting list',
    book: 'Book a spot',
    requested: 'Requested',
    going: "You're Going",
    waitlisted: (position: number | null) => (position ? `Waitlisted · #${position}` : 'Waitlisted'),
    full: (type: PostType) => `${TYPE_LABEL[type]} full`,
    started: 'Already started',
    attended: 'You went',
    cancelled: 'Cancelled',
    manage: 'Manage post',
  },
  fullNote: {
    title: (type: PostType) => `This ${NOUN[type]} is full`,
    body: (capacity: number | null) =>
      capacity
        ? `All ${capacity} spots are taken. Explore other activities to find your next adventure.`
        : 'Every spot is taken. Explore other activities to find your next adventure.',
  },
  cancelledNote: {
    title: 'This was cancelled',
    body: 'The host cancelled it. Explore other activities nearby.',
  },
  leave: {
    title: (type: PostType) => `Leave this ${NOUN[type]}?`,
    body: 'Your spot goes to the next person waiting.',
    withdrawTitle: 'Withdraw your request?',
    withdrawBody: 'The host will no longer see it.',
    confirm: 'Leave',
    withdraw: 'Withdraw',
    stay: 'Stay',
  },
  safety: {
    title: 'Safety tips',
    body: 'Stay with the group, wear sturdy shoes, and share your plans with someone you trust.',
  },
  going: {
    title: "Who's Going",
    total: (n: number) => `${n} total`,
    attending: 'Attending',
    pending: 'Pending',
    waitlisted: (n: number | null) => (n ? `Waitlisted · #${n}` : 'Waitlisted'),
    accept: 'Accept',
    decline: 'Decline',
    showMore: 'Show more',
    showAll: (total: number) => `Show all ${total}`,
    emptyTitle: 'No one’s joined yet',
    emptyBody: 'Be the first to join and get the adventure started.',
    you: 'You',
    failed: 'Couldn’t load who’s going.',
    retry: 'Try again',
  },
  comments: {
    title: 'Comments',
    emptyTitle: 'No comments yet',
    emptyBody: 'Have a question? Start the conversation.',
    placeholder: 'Add a comment...',
    send: 'Send comment',
    soon: 'Comments are coming soon — your message is kept here.',
    loading: 'Loading comments',
    more: 'Show more comments',
    reply: 'Reply',
    replyTo: (name: string) => `Reply to ${name}`,
    openProfile: (name: string) => `${name}'s profile`,
    replyingTo: (name: string) => `Replying to ${name}`,
    replyPlaceholder: (name: string) => `Reply to ${name}...`,
    cancelReply: 'Cancel',
    sending: 'Sending…',
  },
  host: {
    cancel: 'Cancel this post',
    cancelTitle: 'Cancel this post?',
    cancelBody: 'Everyone going or waiting gets a notification. This can’t be undone.',
    cancelConfirm: 'Cancel post',
    delete: 'Delete post',
    deleteTitle: 'Delete this post?',
    deleteBody: 'It disappears for everyone. This can’t be undone.',
    deleteConfirm: 'Delete',
    hasAttendees: 'People have joined, so it can’t be deleted. Cancel it instead?',
    keep: 'Keep it',
  },
  report: 'Report activity',
  close: 'Close',
  notFound: {
    title: 'This post isn’t available',
    body: 'It may have been removed, or the host has made it private.',
    action: 'Go back',
  },
  failed: {
    title: 'This post didn’t load',
    body: 'Check your connection and try again.',
    action: 'Try again',
  },
};

export const postErrorMessages: Record<PostDetailErrorCode, string> = {
  notFound: 'This post isn’t available any more.',
  commentsUnavailable: 'Comments are coming soon — your message is kept here.',
  commentInvalid: 'Write something first (up to 500 characters).',
  postFull: 'It just filled up. Try the waiting list, or explore other activities.',
  postStarted: 'It has already started, so new people can’t join.',
  postCancelled: 'The host cancelled it.',
  externalBooking: 'Book this one through its link.',
  hasAttendees: 'People have joined, so it can’t be deleted. Cancel it instead.',
  notAllowed: 'You can’t do that on this post.',
  rateLimited: 'Too many tries. Wait a moment and try again.',
  network: 'You seem to be offline. Check your connection and try again.',
  sessionExpired: 'Your session ended. Sign in again to continue.',
  unknown: 'Something went wrong on our side. Try again.',
};
