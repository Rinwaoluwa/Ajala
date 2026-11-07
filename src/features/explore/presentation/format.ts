import type { CostShare, PostPrice } from '../domain/entities/Explore';

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

/**
 * An amount in its smallest unit, written out: amountCents / 10 ** exponent
 * (spec §1.5). "₦5,000", "$20.50" — whole amounts without decimals.
 */
export function formatMoney(cents: number, exponent: number, currency: string): string {
  const amount = cents / 10 ** exponent;
  const fixed = Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(exponent);
  const [whole = '0', fraction] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const symbol = SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${grouped}${fraction ? `.${fraction}` : ''}`;
}

/** A post's price: "₦5,000". */
export function formatPrice(price: PostPrice): string {
  return formatMoney(price.amountCents, price.exponent, price.currency);
}

/** A shared cost's per-person figure: "₦12,000" (the card adds "About … each"). */
export function formatCostShare(share: CostShare): string {
  return formatMoney(share.perPersonCents, share.exponent, share.currency);
}
