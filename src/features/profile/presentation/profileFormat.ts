/** How the profile pages write dates: "24 Oct", "10:00", "May 2026". */
const DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const MONTH_DAY = new Intl.DateTimeFormat('en-GB', { month: 'short', day: 'numeric' });
const MONTH_YEAR = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' });
const TIME = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

const valid = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const formatDay = (iso: string | null) => {
  const d = valid(iso);
  return d ? DAY.format(d) : null;
};
export const formatMonthDay = (iso: string | null) => {
  const d = valid(iso);
  return d ? MONTH_DAY.format(d) : null;
};
export const formatMonthYear = (iso: string | null) => {
  const d = valid(iso);
  return d ? MONTH_YEAR.format(d) : null;
};
export const formatTime = (iso: string | null) => {
  const d = valid(iso);
  return d ? TIME.format(d) : null;
};
