/**
 * How a trip writes its dates, as the Trips frames do: "18 Oct", and "18–20
 * Oct" when it runs over several days. Everything is in the phone's own time
 * zone, so the day shown is the day the person lives through.
 */

const DAY = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
});
const DAY_YEAR = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function parse(iso: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * The day, or the span of days when the trip ends on a later day: "18–20 Oct",
 * "30 Oct – 2 Nov", and with years only when it crosses one. An end on the
 * same day (or a bad one) reads as the single day.
 */
export function tripDates(startAt: string | null, endAt: string | null): string | null {
  const start = parse(startAt);
  if (!start) return null;
  const end = parse(endAt);
  if (!end || end <= start || sameDay(start, end)) return DAY.format(start);
  if (start.getFullYear() !== end.getFullYear()) return `${DAY_YEAR.format(start)} – ${DAY_YEAR.format(end)}`;
  if (start.getMonth() !== end.getMonth()) return `${DAY.format(start)} – ${DAY.format(end)}`;
  return `${start.getDate()}–${DAY.format(end)}`;
}

/**
 * The span of days, for a trip that ends on a later day than it starts
 * ("18–20 Oct"); null for a trip of one day, which its card dates as any post.
 */
export function tripSpan(startAt: string | null, endAt: string | null): string | null {
  const start = parse(startAt);
  const end = parse(endAt);
  if (!start || !end || end <= start || sameDay(start, end)) return null;
  return tripDates(startAt, endAt);
}
