// From its own file, not the components' index: this module is plain functions, and the index
// would bring every native component with it (into tests too).
import { formatCardDate } from '@shared/components/post/formatPost';
import { formatMinor } from '@shared/money';

import type { PostPrice } from '../domain/entities/Explore';

/**
 * Dates and money as Explore's cards write them, in the phone's time zone:
 * "Oct 4", "Friday · 7:00 PM", "₦5,000".
 */

const SHORT_DAY = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const WEEKDAY = new Intl.DateTimeFormat('en-US', { weekday: 'long' });
const TIME = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

const valid = (iso: string | null): Date | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** "Oct 4" */
export function formatShortDay(iso: string | null): string | null {
  const d = valid(iso);
  return d ? SHORT_DAY.format(d) : null;
}

/** "Friday · 7:00 PM" */
export function formatWeekdayTime(iso: string | null): string | null {
  const d = valid(iso);
  return d ? `${WEEKDAY.format(d)} · ${TIME.format(d)}` : null;
}

/**
 * A text card's day: "Thu 26 Nov", and the year only when it is not this one
 * ("Thu 26 Nov 2027"). The design writes the year every time; in the drawer the
 * line is short of room, and this year goes without saying.
 */
export function formatCardDay(iso: string | null, now: Date = new Date()): string | null {
  const d = valid(iso);
  const day = d && iso ? formatCardDate(iso) : null;
  if (!d || !day) return null;
  return d.getFullYear() === now.getFullYear() ? day : `${day} ${d.getFullYear()}`;
}

/** "6:00 PM" */
export function formatClock(iso: string | null): string | null {
  const d = valid(iso);
  return d ? TIME.format(d) : null;
}

/**
 * An amount in its smallest unit, written out: amountCents / 10 ** exponent
 * (spec §1.5). "₦5,000", "$20.50", "CA$20" — the app's one way of writing money
 * (`@shared/money`): any currency, the phone's own number style, whole amounts
 * without decimals.
 */
export function formatMoney(cents: number, exponent: number, currency: string): string {
  return formatMinor(cents, currency, exponent);
}

/** A post's price: "₦5,000". */
export function formatPrice(price: PostPrice): string {
  return formatMoney(price.amountCents, price.exponent, price.currency);
}
