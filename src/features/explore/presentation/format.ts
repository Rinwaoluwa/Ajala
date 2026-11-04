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

const SYMBOLS: Record<string, string> = {
  NGN: '₦',
  USD: '$',
  GBP: '£',
  EUR: '€',
  CAD: 'CA$',
  GHS: 'GH₵',
  KES: 'KSh',
};

/** "₦5,000", "$20.50" — whole amounts without decimals. */
export function formatPrice(price: PostPrice): string {
  const amount = price.amountCents / 10 ** price.exponent;
  const fixed = Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(price.exponent);
  const [whole, fraction] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const symbol = SYMBOLS[price.currency] ?? `${price.currency} `;
  return `${symbol}${grouped}${fraction ? `.${fraction}` : ''}`;
}
