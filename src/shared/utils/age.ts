/**
 * Ajala is for adults: no one under 18 may sign up (product, 11 Nov). Asked
 * wherever a date of birth is: email sign-up, and profile setup for a Google or
 * Apple account that arrived without one. The app only refuses the form; the
 * server must make the same check (an older build, or the API called directly).
 */
export const MIN_AGE = 18;

/**
 * Whether someone born on `dateOfBirth` (`YYYY-MM-DD`) is at least `minAge` on
 * `today`, by the phone's own calendar day. They turn 18 on their 18th
 * birthday; someone born on 29 February, on 1 March in a year without one.
 * False for anything that is not a `YYYY-MM-DD` date.
 */
export function isOldEnough(dateOfBirth: string, today: Date, minAge: number = MIN_AGE): boolean {
  const match = /^(\d{4})-(\d{2}-\d{2})$/.exec(dateOfBirth);
  if (!match) return false;
  const pad = (n: number) => String(n).padStart(2, '0');
  const todayDate = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const birthday = `${Number(match[1]) + minAge}-${match[2]}`;
  // Same-width YYYY-MM-DD strings sort as dates; "02-29" falls between "02-28" and "03-01".
  return birthday <= todayDate;
}
