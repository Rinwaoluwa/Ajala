import type { Currency } from '../domain/entities/PostDraft';

/**
 * How the wizard writes money and moments: "₦15,000", "Thu 22 Oct", "5:30 PM".
 * Times follow the phone's 12- or 24-hour setting.
 */

const money: Record<Currency, Intl.NumberFormat> = {
  NGN: new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }),
  USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }),
};

export const formatMoney = (amount: number, currency: Currency) => money[currency].format(amount);

const DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const SHORT_DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

export const formatDay = (date: Date) => DAY.format(date);
export const formatShortDay = (date: Date) => SHORT_DAY.format(date);
export const formatTime = (date: Date) =>
  date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
