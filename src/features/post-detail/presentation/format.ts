import type { Money, PostRecurrence } from '../domain/entities/PostDetail';

/** "Sunday, Oct 18 · 6:30 AM" and "$15.00", in the phone's own time zone. */

const DAY = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
const SHORT_DAY = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const DATE = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const TIME = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

const parse = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * When it is on. With an end the same day, a time range ("Sunday, Oct 18 ·
 * 6:30 AM – 9:00 AM"); across days, both ends with their day ("Fri, Oct 17 ·
 * 6:00 PM – Sun, Oct 19 · 2:00 PM"). An end at or before the start is ignored.
 */
export function formatWhen(startIso: string | null, endIso: string | null = null): string | null {
  const start = parse(startIso);
  if (!start) return null;
  const end = parse(endIso);
  if (!end || end.getTime() <= start.getTime()) return `${DAY.format(start)} · ${TIME.format(start)}`;
  if (sameDay(start, end)) return `${DAY.format(start)} · ${TIME.format(start)} – ${TIME.format(end)}`;
  return `${SHORT_DAY.format(start)} · ${TIME.format(start)} – ${SHORT_DAY.format(end)} · ${TIME.format(end)}`;
}

/** "Repeats weekly", "Repeats every 2 weeks until Dec 20, 2026". */
export function formatRecurrence(r: PostRecurrence): string {
  const how = { weekly: 'weekly', biweekly: 'every 2 weeks', monthly: 'monthly' }[r.frequency];
  // `endsOn` is a plain date; read at noon so no time zone moves it to the day before.
  const until = r.endsOn ? parse(`${r.endsOn}T12:00:00`) : null;
  return until ? `Repeats ${how} until ${DATE.format(until)}` : `Repeats ${how}`;
}

/**
 * Money with the currency's own decimals (`exponent`, spec §1.5): "$15.50",
 * "¥1,500". A whole naira amount drops its kobo ("₦12,000"), as the design shows.
 */
export function formatPrice(price: Money): string {
  const whole = Number.isInteger(price.amount);
  const decimals = Math.max(0, Math.min(price.exponent, 20));
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: price.currency,
      // "₦12,000", not "NGN 12,000".
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: whole && price.currency === 'NGN' ? 0 : decimals,
      maximumFractionDigits: decimals,
    }).format(price.amount);
  } catch {
    return `${price.currency} ${price.amount}`;
  }
}

/** "Just now", "12m ago", "5h ago", "3d ago", then the date ("Oct 18"). */
export function formatAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60_000);
  if (Number.isNaN(minutes)) return '';
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(then);
}
