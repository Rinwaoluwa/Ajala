/**
 * The words on a post card. A card's date and time as the designs write them: "Thu 22 Oct" and "18:00"
 * on the older cards, "Thu 26 Nov" and "6:00 PM" on a list card, in the event's own moment, shown in
 * the phone's time zone.
 */

const DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const TIME = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

export function formatCardDate(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = Object.fromEntries(DAY.formatToParts(date).map((p) => [p.type, p.value]));
  return `${parts.weekday} ${parts.day} ${parts.month}`;
}

export function formatCardTime(iso: string): string | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : TIME.format(date);
}

const CLOCK = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

/**
 * The day on a post's list card (`PostListCard`): "Thu 26 Nov", and the year
 * only when it is not this one ("Thu 7 Jan 2027"). The design writes the year
 * every time; on a phone the line is short of room for where it is, and this
 * year goes without saying.
 */
export function formatCardDay(iso: string | null, now: Date = new Date()): string | null {
  const day = iso ? formatCardDate(iso) : null;
  if (!iso || !day) return null;
  const year = new Date(iso).getFullYear();
  return year === now.getFullYear() ? day : `${day} ${year}`;
}

/** The time on a post's list card, on a twelve-hour clock as the design writes it: "6:00 PM". */
export function formatClock(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : CLOCK.format(date);
}

/** "7 km away" — whole kilometres from 1, "Under 1 km" below. */
export function formatDistance(km: number | null): string | null {
  if (km === null || !Number.isFinite(km)) return null;
  return km < 1 ? 'Under 1 km away' : `${Math.round(km)} km away`;
}
