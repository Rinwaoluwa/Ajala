/**
 * The words on a post card. A card's date and time as the design writes them: "Thu 22 Oct" and "18:00",
 * in the event's own moment, shown in the phone's time zone.
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

/** "7 km away" — whole kilometres from 1, "Under 1 km" below. */
export function formatDistance(km: number | null): string | null {
  if (km === null || !Number.isFinite(km)) return null;
  return km < 1 ? 'Under 1 km away' : `${Math.round(km)} km away`;
}
