/** How a trip card writes its date and time: "18 Oct", "10:00" — as the Trips frames do. */

const DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const TIME = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

export function tripDay(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : DAY.format(d);
}

export function tripTime(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : TIME.format(d);
}
