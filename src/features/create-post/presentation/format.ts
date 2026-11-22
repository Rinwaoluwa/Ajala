import { formatAmount } from '@shared/money';

import type { Currency } from '../domain/entities/PostDraft';

/**
 * How the wizard writes money and moments: "₦15,000", "Thu 22 Oct", "5:30 PM".
 * Money is written by the app's one formatter (`@shared/money`): any currency,
 * with its own decimals, in the phone's own number style. Times follow the
 * phone's 12- or 24-hour setting.
 */

/** An amount in the currency's whole units: "₦15,000", "$20.50". */
export const formatMoney = (amount: number, currency: Currency) => formatAmount(amount, currency);

const DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const SHORT_DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

export const formatDay = (date: Date) => DAY.format(date);
export const formatShortDay = (date: Date) => SHORT_DAY.format(date);
export const formatTime = (date: Date) =>
  date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
