import type { MapPin, PostPreview, PostType, ReportReasonCode } from '../entities/Explore';

/** Posts per page in the Explore list: "Meetups Near You" and search results. */
export const LIST_PAGE_SIZE = 20;

/** The type chips over the map, in the order the design draws them. */
export const PIN_TYPES: readonly { type: PostType; label: string }[] = [
  { type: 'meetup', label: 'Meetup' },
  { type: 'event', label: 'Event' },
  { type: 'plan', label: 'Plan' },
  { type: 'group', label: 'Group' },
];

/** Whether a post starts on the same calendar day as `now`, where the phone is. */
export function isHappeningToday(startAt: string, now: Date): boolean {
  const start = new Date(startAt);
  if (Number.isNaN(start.getTime())) return false;
  return (
    start.getFullYear() === now.getFullYear() &&
    start.getMonth() === now.getMonth() &&
    start.getDate() === now.getDate()
  );
}

/** The bolt's "Happening today" filter, over the pins the API sent; off, every pin. */
export function visiblePins(pins: readonly MapPin[], todayOnly: boolean, now: Date): MapPin[] {
  return todayOnly ? pins.filter((p) => isHappeningToday(p.startAt, now)) : [...pins];
}

/** How many places are left, or null when there is no limit. Never below zero. */
export function spotsLeft(goingCount: number, capacity: number | null): number | null {
  return capacity === null ? null : Math.max(capacity - goingCount, 0);
}

/**
 * What the mini card's main button does, from the post's own state (spec §2.13).
 * The server decides; this only reads what it said.
 */
export type RsvpAction =
  /** Join (RSVP) — `price` null is free. Private posts ask instead. */
  | { kind: 'join'; request: boolean; price: PostPreview['price'] }
  /** A paid Event: open its link to book. */
  | { kind: 'book'; price: PostPreview['price'] }
  | { kind: 'requested' }
  | { kind: 'going' }
  | { kind: 'waitlisted'; position: number | null }
  /** The host's own post. */
  | { kind: 'hosting' }
  /** Declined or removed: no button at all. */
  | { kind: 'none' };

export function rsvpAction(post: PostPreview): RsvpAction {
  if (post.isHost) return { kind: 'hosting' };
  switch (post.rsvpState) {
    case 'going':
      return { kind: 'going' };
    case 'requested':
      return { kind: 'requested' };
    case 'waitlisted':
      return { kind: 'waitlisted', position: post.waitlistPosition };
    case 'declined':
    case 'removed':
      return { kind: 'none' };
    default:
      if (post.joinMode === 'external') return { kind: 'book', price: post.price };
      return { kind: 'join', request: post.visibility === 'private', price: post.price };
  }
}

/** Optimistic state after tapping Join, until the server answers. */
export function optimisticJoin(post: PostPreview): PostPreview {
  if (post.visibility === 'private') return { ...post, rsvpState: 'requested' };
  return { ...post, rsvpState: 'going', goingCount: post.goingCount + 1 };
}

/**
 * "Report activity" lists nine reasons; the API takes one of five
 * (`ReportReason`). The two it names are sent as themselves, everything else as
 * `other` — and every ticked reason is written at the head of the details, so
 * nothing the person said is lost.
 */
export const REPORT_REASONS = [
  { key: 'scam', label: 'Scam or fraud', code: 'other' },
  { key: 'spam', label: 'Spam', code: 'spam' },
  { key: 'commercial', label: 'Commercial or promotional activity', code: 'other' },
  { key: 'inappropriate', label: 'Inappropriate or sexual content', code: 'inappropriate_content' },
  { key: 'dating', label: 'Dating or hookup intent', code: 'other' },
  { key: 'misleading', label: 'Misleading or fake activity', code: 'other' },
  { key: 'underage', label: 'Underage user involved', code: 'other' },
  { key: 'safety', label: 'Safety concern', code: 'other' },
  { key: 'other', label: 'Other', code: 'other' },
] as const satisfies readonly { key: string; label: string; code: ReportReasonCode }[];

export type ReportReasonKey = (typeof REPORT_REASONS)[number]['key'];

/** `details` is at most 500 characters (spec §4). */
export const REPORT_DETAILS_MAX = 500;

/** Ranked: when several are ticked, the most specific one the API knows is sent. */
const CODE_RANK: Record<ReportReasonCode, number> = {
  inappropriate_content: 3,
  spam: 2,
  harassment: 1,
  impersonation: 1,
  other: 0,
};

function reasonsLine(keys: readonly ReportReasonKey[]): string {
  const labels = REPORT_REASONS.filter((r) => keys.includes(r.key)).map((r) => r.label);
  return labels.length ? `Reasons: ${labels.join(', ')}.\n\n` : '';
}

/** How many characters of their own the person has, after the reasons line. */
export function reportDetailsRoom(keys: readonly ReportReasonKey[]): number {
  return Math.max(REPORT_DETAILS_MAX - reasonsLine(keys).length, 0);
}

export function canSubmitReport(keys: readonly ReportReasonKey[], details: string): boolean {
  return keys.length > 0 && details.trim().length > 0;
}

export function toReportPayload(
  keys: readonly ReportReasonKey[],
  details: string,
): { reason: ReportReasonCode; details: string } {
  const chosen = REPORT_REASONS.filter((r) => keys.includes(r.key));
  const reason = chosen.reduce<ReportReasonCode>(
    (best, r) => (CODE_RANK[r.code] > CODE_RANK[best] ? r.code : best),
    'other',
  );
  const text = `${reasonsLine(keys)}${details.trim()}`;
  return { reason, details: text.slice(0, REPORT_DETAILS_MAX) };
}

/** Post search takes 2 to 100 characters (spec §2.18). */
export const SEARCH_MIN = 2;
export const SEARCH_MAX = 100;
/** The server stops at 100 results a search; past that the person should narrow it. */
export const SEARCH_RESULT_CAP = 100;

/**
 * The Explore list's search box, read on submit (search has no typeahead):
 * nothing typed goes back to the list; one character asks for more.
 */
export type SearchInput = { kind: 'empty' } | { kind: 'tooShort' } | { kind: 'ready'; words: string };

export function readSearch(text: string): SearchInput {
  const words = text.trim();
  if (!words) return { kind: 'empty' };
  if (words.length < SEARCH_MIN) return { kind: 'tooShort' };
  return { kind: 'ready', words: words.slice(0, SEARCH_MAX) };
}
