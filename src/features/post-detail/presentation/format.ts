import type { PostPrice } from '../domain/entities/PostDetail';

/** "Sunday, Oct 18 · 6:30 AM" and "$15.00", in the phone's own time zone. */

const DAY = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
const TIME = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

export function formatWhen(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : `${DAY.format(d)} · ${TIME.format(d)}`;
}

/** Whole amounts without decimals ("₦5,000"); otherwise two ("$15.50"). */
export function formatPrice(price: PostPrice): string {
  const whole = Number.isInteger(price.amount);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: price.currency,
      // "₦12,000", not "NGN 12,000".
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: whole && price.currency === 'NGN' ? 0 : 2,
      maximumFractionDigits: 2,
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
