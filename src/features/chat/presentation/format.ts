/**
 * How Messages writes time, in the phone's own time zone: "10:42" today,
 * "Yesterday", "Mon" this week, then "17 Oct"; "09:41" under a message; "Today",
 * "Yesterday" or "Sat, 17 Oct" between days.
 */

const TIME = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
const WEEKDAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short' });
const DAY_MONTH = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const FULL_DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const CLOCK = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const daysAgo = (iso: string, now: Date) =>
  Math.round((startOfDay(now) - startOfDay(new Date(iso))) / 86_400_000);

export function listTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const days = daysAgo(iso, now);
  if (days <= 0) return TIME.format(date);
  if (days === 1) return 'Yesterday';
  if (days < 7) return WEEKDAY.format(date);
  return DAY_MONTH.format(date);
}

export const messageTime = (iso: string): string => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : TIME.format(date);
};

export function dayLabel(
  iso: string,
  labels: { today: string; yesterday: string },
  now = new Date(),
): string {
  const days = daysAgo(iso, now);
  if (days <= 0) return labels.today;
  if (days === 1) return labels.yesterday;
  return FULL_DAY.format(new Date(iso));
}

/** "Sat, 17 Oct · 9:00 AM · Lagos" for the activity card at the top of a chat. */
export function postMeta(startAt: string | null, placeName: string | null): string {
  const parts: string[] = [];
  if (startAt) {
    const d = new Date(startAt);
    if (!Number.isNaN(d.getTime())) parts.push(FULL_DAY.format(d), CLOCK.format(d));
  }
  if (placeName) parts.push(placeName);
  return parts.join(' · ');
}
