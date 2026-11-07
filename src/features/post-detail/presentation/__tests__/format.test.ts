import { describe, expect, it } from '@jest/globals';

import { formatPrice, formatRecurrence, formatWhen } from '../format';

/** A local date-time, so the test reads the same in any time zone. */
const local = (y: number, mo: number, d: number, h: number, mi = 0) => new Date(y, mo - 1, d, h, mi).toISOString();

describe('post page formatting', () => {
  it('shows a time range the same day, and both days across days', () => {
    expect(formatWhen(local(2026, 10, 18, 6, 30))).toBe('Sunday, Oct 18 · 6:30 AM');
    expect(formatWhen(local(2026, 10, 18, 6, 30), local(2026, 10, 18, 9))).toBe(
      'Sunday, Oct 18 · 6:30 AM – 9:00 AM',
    );
    expect(formatWhen(local(2026, 10, 16, 18), local(2026, 10, 18, 14))).toBe(
      'Fri, Oct 16 · 6:00 PM – Sun, Oct 18 · 2:00 PM',
    );
    // An end before the start is not shown.
    expect(formatWhen(local(2026, 10, 18, 9), local(2026, 10, 18, 8))).toBe('Sunday, Oct 18 · 9:00 AM');
  });

  it('says how it repeats', () => {
    expect(formatRecurrence({ frequency: 'weekly', endsOn: null })).toBe('Repeats weekly');
    expect(formatRecurrence({ frequency: 'biweekly', endsOn: '2026-12-20' })).toBe(
      'Repeats every 2 weeks until Dec 20, 2026',
    );
  });

  it('formats money with the currency’s own decimals', () => {
    expect(formatPrice({ amount: 12000, currency: 'NGN', exponent: 2 })).toBe('₦12,000');
    expect(formatPrice({ amount: 15.5, currency: 'USD', exponent: 2 })).toBe('$15.50');
    expect(formatPrice({ amount: 1500, currency: 'JPY', exponent: 0 })).toBe('¥1,500');
  });
});
