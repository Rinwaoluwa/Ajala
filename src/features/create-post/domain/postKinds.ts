/**
 * What can be created — the four post types the API knows (`PostType`), in the
 * order and words of the "Create something" modal. The choice becomes `type` on
 * `POST /posts` (API map §5); the modal itself calls nothing.
 */
export type PostKind = 'meetup' | 'event' | 'plan' | 'group';

export const POST_KINDS: readonly { kind: PostKind; title: string; body: string }[] = [
  { kind: 'meetup', title: 'Meetup', body: 'Casual in-person gathering' },
  { kind: 'event', title: 'Event', body: 'Ticketed or large-scale event' },
  { kind: 'plan', title: 'Plan', body: 'Trip or activity with friends' },
  { kind: 'group', title: 'Group activity', body: 'Recurring activities with travellers' },
];
