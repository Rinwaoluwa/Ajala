/**
 * How a trip card writes its dates and time, as the Trips frames do: "18 Oct",
 * "18–20 Oct" when it runs over several days, and "10:00". Everything is in the
 * phone's own time zone, so the day shown is the day the person lives through.
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
const TIME = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function parse(iso: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function tripDay(iso: string | null): string | null {
  const d = parse(iso);
  return d ? DAY.format(d) : null;
}

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

export function tripTime(iso: string | null): string | null {
  const d = parse(iso);
  return d ? TIME.format(d) : null;
}
