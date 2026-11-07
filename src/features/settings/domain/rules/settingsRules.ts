import type { Account, DataExport, Draft, PostType, ProfileEdit, SocialLinks } from '../entities/Settings';

/**
 * The Settings screens' rules: field limits from the API (spec §4) and the small
 * pieces of logic the screens share. The server checks again; these save a trip.
 */

export const BIO_MAX = 160;
export const NAME_MAX = 60;
export const HANDLE_MIN = 3;
export const HANDLE_MAX = 20;
export const DELETE_REASON_MAX = 500;
export const SOCIAL_LINK_MAX = 200;
/** `extras.travelStyles` and `extras.favouriteCityIds` each take up to 10 (spec §4). */
export const TRAVEL_STYLES_MAX = 10;
export const FAVOURITE_CITIES_MAX = 10;

/**
 * Whether the account can sign in with a password. Google- and Apple-only
 * accounts cannot: they re-authenticate with an emailed code, and "Change
 * password" sets a first one instead (spec §2.5, §2.6).
 */
export const hasPassword = (account: Pick<Account, 'identities'>) =>
  account.identities.some((i) => i.provider === 'email');

/** Adds `value`, or takes it out if present. A full list is left as it is. */
export function toggleIn<T>(list: readonly T[], value: T, max = Infinity): T[] {
  if (list.includes(value)) return list.filter((v) => v !== value);
  return list.length >= max ? [...list] : [...list, value];
}

/**
 * Whether asking for an export again could work now. One that is still being
 * built blocks a new one; otherwise the server decides (one a day, 409).
 */
export const canRequestExport = (current: DataExport | null) => current?.status !== 'queued';

/** Letters, digits, "." and "_", 3–20 long (spec §2.4). */
export function isHandleFormatValid(handle: string): boolean {
  return new RegExp(`^[A-Za-z0-9._]{${HANDLE_MIN},${HANDLE_MAX}}$`).test(handle);
}

/** "@ada.travels" or "ada.travels" → "ada.travels". */
export const normaliseHandle = (text: string) => text.trim().replace(/^@+/, '');

/**
 * The design's one "Display name" over the API's two fields: the first word is
 * the first name, the rest the last name (API map §12, "Full Name as one field").
 */
export function splitDisplayName(display: string): { firstName: string; lastName: string } {
  const words = display.trim().split(/\s+/).filter(Boolean);
  return { firstName: words[0] ?? '', lastName: words.slice(1).join(' ') };
}

export const displayNameOf = (a: Pick<Account, 'firstName' | 'lastName'>) =>
  [a.firstName, a.lastName].filter(Boolean).join(' ');

export function isDisplayNameValid(display: string): boolean {
  const { firstName, lastName } = splitDisplayName(display);
  return (
    firstName.length > 0 && lastName.length > 0 && firstName.length <= NAME_MAX && lastName.length <= NAME_MAX
  );
}

/** A new password: 8–128 characters with an uppercase letter and a digit (spec §4). */
export function passwordChecks(password: string) {
  return {
    length: password.length >= 8 && password.length <= 128,
    upper: /[A-Z]/.test(password),
    digit: /\d/.test(password),
  };
}

export const isPasswordValid = (password: string) => Object.values(passwordChecks(password)).every(Boolean);

export const isEmailLike = (text: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text.trim()) && text.length <= 320;

/** Only what changed, so `PATCH /me` leaves the rest alone. */
export function diffProfile(account: Account, next: ProfileEdit): ProfileEdit {
  const out: ProfileEdit = {};
  if (next.firstName !== undefined && next.firstName !== account.firstName) out.firstName = next.firstName;
  if (next.lastName !== undefined && next.lastName !== account.lastName) out.lastName = next.lastName;
  if (next.handle !== undefined && next.handle !== (account.handle ?? '')) out.handle = next.handle;
  if (next.bio !== undefined && (next.bio ?? '') !== (account.bio ?? '')) out.bio = next.bio || null;
  if (next.homeCityId !== undefined && next.homeCityId !== (account.homeCity?.id ?? null)) {
    out.homeCityId = next.homeCityId;
  }
  if (next.languages && next.languages.join() !== account.languages.join()) out.languages = next.languages;
  if (next.socialLinks && !sameLinks(next.socialLinks, account.socialLinks))
    out.socialLinks = next.socialLinks;
  if (next.travelStyles && next.travelStyles.join() !== account.travelStyles.join())
    out.travelStyles = next.travelStyles;
  if (
    next.favouriteCityIds &&
    next.favouriteCityIds.join() !== account.favouriteCities.map((c) => c.id).join()
  )
    out.favouriteCityIds = next.favouriteCityIds;
  return out;
}

const sameLinks = (a: SocialLinks, b: SocialLinks) =>
  (a.instagram ?? '') === (b.instagram ?? '') &&
  (a.tiktok ?? '') === (b.tiktok ?? '') &&
  (a.website ?? '') === (b.website ?? '');

export const hasChanges = (edit: ProfileEdit) => Object.keys(edit).length > 0;

/** Whether this edit touches `extras`, which then has to be sent. */
export const editsExtras = (edit: ProfileEdit) =>
  !!(edit.languages || edit.socialLinks || edit.travelStyles || edit.favouriteCityIds);

/**
 * The extras record with this edit's fields merged in. `PATCH /me` may replace
 * extras whole, so everything else the server sent (pronouns, tagline…) goes
 * back unchanged rather than being wiped.
 */
export function mergeExtras(extras: Record<string, unknown>, edit: ProfileEdit): Record<string, unknown> {
  return {
    ...extras,
    ...(edit.languages ? { languages: edit.languages } : null),
    ...(edit.socialLinks ? { socialLinks: cleanLinks(edit.socialLinks) } : null),
    ...(edit.travelStyles ? { travelStyles: edit.travelStyles } : null),
    ...(edit.favouriteCityIds ? { favouriteCityIds: edit.favouriteCityIds } : null),
  };
}

export function cleanLinks(links: SocialLinks): SocialLinks {
  const tidy = (v: string | null) => (v && v.trim() ? v.trim().slice(0, SOCIAL_LINK_MAX) : null);
  return { instagram: tidy(links.instagram), tiktok: tidy(links.tiktok), website: tidy(links.website) };
}

/** "Edited 3 days ago", "Edited just now". */
export function editedAgo(updatedAt: string, now: Date = new Date()): string {
  const then = new Date(updatedAt).getTime();
  if (Number.isNaN(then)) return 'Edited recently';
  const minutes = Math.max(0, Math.round((now.getTime() - then) / 60_000));
  if (minutes < 1) return 'Edited just now';
  if (minutes < 60) return `Edited ${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Edited ${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `Edited ${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.round(days / 30);
  return `Edited ${months} month${months === 1 ? '' : 's'} ago`;
}

export type DraftFilter = 'all' | PostType;

export const filterDrafts = (drafts: readonly Draft[], filter: DraftFilter) =>
  filter === 'all' ? drafts.slice() : drafts.filter((d) => d.type === filter);

/** Newest first. */
export const sortDrafts = (drafts: readonly Draft[]) =>
  drafts.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

/** This phone first, then the most recently used. */
export const sortSessions = <T extends { current: boolean; lastUsedAt: string }>(sessions: readonly T[]) =>
  sessions
    .slice()
    .sort((a, b) => Number(b.current) - Number(a.current) || b.lastUsedAt.localeCompare(a.lastUsedAt));
