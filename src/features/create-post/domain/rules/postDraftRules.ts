import type { PostKind } from '../postKinds';
import { emptyDraft, type PostDraft, type PostSubmission, type SavedPost } from '../entities/PostDraft';

/**
 * The create wizard's rules, from the API's publish rules and field limits
 * (spec §2.12, §4; API map §5). The server has the last word — it re-checks
 * everything on Publish — but checking here saves a round trip per mistake.
 */

export const WIZARD_STEPS = 5;
export const PHOTOS_MIN = 2;
export const PHOTOS_MAX = 4;
/** The design says 100; the API takes 80 (API map §5: "use 80"). */
export const TITLE_MAX = 80;
/** The design's limit; the API takes up to 1000. */
export const DESCRIPTION_MAX = 500;
export const PLACE_MAX = 200;
/** A checklist line (Plans), and the most lines a Plan takes. */
export const NOTE_MAX = 120;
export const NOTES_MAX = 30;
export const INTERESTS_MIN = 1;
export const INTERESTS_MAX = 3;
export const EXTERNAL_URL_MAX = 2048;
/** `priceCents` is 1–100,000,000 in the smallest unit. */
const PRICE_CENTS_MAX = 100_000_000;
/** NGN (kobo) and USD (cents) both have two decimal places. */
const MINOR_UNITS = 100;

/** The steps, in order. */
export type WizardStep = 'basics' | 'schedule' | 'participants' | 'cost' | 'review';
export const STEPS: readonly WizardStep[] = ['basics', 'schedule', 'participants', 'cost', 'review'];

export type DraftField =
  | 'photos'
  | 'title'
  | 'description'
  | 'city'
  | 'date'
  | 'startTime'
  | 'endTime'
  | 'place'
  | 'notes'
  | 'capacity'
  | 'amount'
  | 'expected'
  | 'externalUrl'
  | 'interests';

/** What is wrong with a field, for the screen to put into words. */
export type DraftIssue =
  | 'required'
  | 'tooFewPhotos'
  | 'inPast'
  | 'endBeforeStart'
  | 'capacityRange'
  | 'amountRange'
  | 'notHttps'
  | 'interestCount';

export type DraftIssues = Partial<Record<DraftField, DraftIssue>>;

/** Plans and Groups happen in a city chosen on the first step; Meetups and Events at a pin. */
export const needsCity = (kind: PostKind) => kind === 'plan' || kind === 'group';
/** A Meetup or Event cannot publish without a pin (spec §2.12). */
export const needsPin = (kind: PostKind) => kind === 'meetup' || kind === 'event';

// ---------- capacity ----------

/**
 * Capacity per type (spec §2.12): an Event is over 100 or unlimited (`null`), a
 * Group 1–100, Meetups and Plans anything from 1.
 */
export function capacityRange(kind: PostKind): { min: number; max: number; unlimited: boolean } {
  if (kind === 'event') return { min: 101, max: 100_000, unlimited: true };
  if (kind === 'group') return { min: 1, max: 100, unlimited: false };
  return { min: 1, max: 100_000, unlimited: false };
}

export function isCapacityValid(kind: PostKind, capacity: number | null): boolean {
  const range = capacityRange(kind);
  if (capacity === null) return range.unlimited;
  return Number.isInteger(capacity) && capacity >= range.min && capacity <= range.max;
}

/**
 * One tap of − or +. For an Event, − from the minimum goes to "no limit" and +
 * from "no limit" comes back to the minimum.
 */
export function stepCapacity(kind: PostKind, capacity: number | null, delta: 1 | -1): number | null {
  const range = capacityRange(kind);
  if (capacity === null) return delta > 0 ? range.min : null;
  const next = capacity + delta;
  if (next < range.min) return range.unlimited ? null : range.min;
  return Math.min(range.max, next);
}

// ---------- money ----------

/** A whole, positive number typed into a field ("60000", "60,000"), or null. */
export function parseWhole(text: string): number | null {
  const digits = text.replace(/[\s,]/g, '');
  if (!/^\d+$/.test(digits)) return null;
  const n = Number(digits);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/**
 * What each person pays, in whole units. An Event's amount is already per
 * person; a shared cost is the total split between the expected travellers,
 * rounded up so the split covers it.
 */
export function perPersonAmount(draft: PostDraft): number | null {
  const amount = parseWhole(draft.amount);
  if (amount === null) return null;
  if (draft.kind === 'event') return amount;
  const people = parseWhole(draft.expected);
  return people === null ? null : Math.ceil(amount / people);
}

/** The per-person amount in the smallest unit, as `priceCents` (spec §1.5). */
export function priceCentsOf(draft: PostDraft): number | null {
  const each = perPersonAmount(draft);
  if (each === null) return null;
  const cents = each * MINOR_UNITS;
  return cents >= 1 && cents <= PRICE_CENTS_MAX ? cents : null;
}

// ---------- time ----------

/** The day and the start time as one moment, or null until both are set. */
export function startOf(draft: PostDraft): Date | null {
  return draft.date && draft.startTime ? onDay(draft.date, draft.startTime) : null;
}

export function endOf(draft: PostDraft): Date | null {
  return draft.date && draft.endTime ? onDay(draft.date, draft.endTime) : null;
}

function onDay(day: Date, time: Date): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), time.getHours(), time.getMinutes());
}

/** "2026-10-22T18:00:00+01:00": the moment in the phone's own offset (API map §5). */
export function toIsoWithOffset(date: Date): string {
  const pad = (n: number) => String(Math.abs(Math.trunc(n))).padStart(2, '0');
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:00` +
    `${sign}${pad(offset / 60)}:${pad(offset % 60)}`
  );
}

// ---------- links ----------

export function isHttpsUrl(text: string): boolean {
  const url = text.trim();
  return /^https:\/\/[^\s/$.?#][^\s]*\.[^\s]+$/i.test(url) && url.length <= EXTERNAL_URL_MAX;
}

/** A paid Event cannot publish without a link to pay or book (spec §2.12). */
export const needsExternalUrl = (draft: PostDraft) => draft.kind === 'event' && draft.costOn;

// ---------- what each step needs ----------

/** What stops a step from moving on. Empty when it can. */
export function stepIssues(draft: PostDraft, step: WizardStep, now: Date = new Date()): DraftIssues {
  const issues: DraftIssues = {};
  switch (step) {
    case 'basics':
      if (draft.photos.length < PHOTOS_MIN) issues.photos = 'tooFewPhotos';
      if (!draft.title.trim()) issues.title = 'required';
      if (!draft.description.trim()) issues.description = 'required';
      if (needsCity(draft.kind) && !draft.city) issues.city = 'required';
      break;
    case 'schedule': {
      if (!draft.date) issues.date = 'required';
      if (!draft.startTime) issues.startTime = 'required';
      const start = startOf(draft);
      if (start && start.getTime() <= now.getTime()) issues.startTime = 'inPast';
      const end = endOf(draft);
      if (start && end && end.getTime() <= start.getTime()) issues.endTime = 'endBeforeStart';
      if (needsPin(draft.kind) && !draft.place.trim()) issues.place = 'required';
      break;
    }
    case 'participants':
      if (!isCapacityValid(draft.kind, draft.capacity)) issues.capacity = 'capacityRange';
      break;
    case 'cost':
      if (!draft.costOn) break;
      if (parseWhole(draft.amount) === null) issues.amount = 'required';
      else if (priceCentsOf(draft) === null && draft.kind === 'event') issues.amount = 'amountRange';
      if (draft.kind !== 'event' && parseWhole(draft.expected) === null) issues.expected = 'required';
      if (draft.externalUrl.trim() && !isHttpsUrl(draft.externalUrl)) issues.externalUrl = 'notHttps';
      else if (needsExternalUrl(draft) && !draft.externalUrl.trim()) issues.externalUrl = 'required';
      break;
    case 'review':
      if (draft.interestIds.length < INTERESTS_MIN || draft.interestIds.length > INTERESTS_MAX) {
        issues.interests = 'interestCount';
      }
      break;
  }
  return issues;
}

export const canLeaveStep = (draft: PostDraft, step: WizardStep, now?: Date) =>
  Object.keys(stepIssues(draft, step, now)).length === 0;

/** The first step that is not ready to publish, or null when every step is. */
export function firstIncompleteStep(draft: PostDraft, now?: Date): WizardStep | null {
  return STEPS.find((step) => !canLeaveStep(draft, step, now)) ?? null;
}

/** A draft needs only a type and a title (spec §2.12). */
export const canSaveDraft = (draft: PostDraft) => draft.title.trim().length > 0;

// ---------- what is sent ----------

/**
 * The API's form, built from the draft. Blank fields are left out rather than
 * sent empty, so a draft can be saved half-written. The pin is the meeting
 * point's, or a Plan's or Group's city when no meeting point was found.
 */
export function toSubmission(draft: PostDraft): PostSubmission {
  const start = startOf(draft);
  const pin = draft.placeCoords ?? (draft.city ? { lat: draft.city.lat, lng: draft.city.lng } : null);
  const placeName = draft.place.trim() || draft.city?.label || '';
  const priceCents = draft.costOn ? priceCentsOf(draft) : null;
  const checklist =
    draft.kind === 'plan'
      ? draft.notes
          .map((n) => n.text.trim())
          .filter(Boolean)
          .slice(0, NOTES_MAX)
      : [];
  const link = draft.costOn ? draft.externalUrl.trim() : '';

  return {
    type: draft.kind,
    title: draft.title.trim().slice(0, TITLE_MAX),
    ...(draft.description.trim() ? { description: draft.description.trim() } : null),
    ...(start ? { startAt: toIsoWithOffset(start) } : null),
    ...(pin ? { lat: pin.lat, lng: pin.lng } : null),
    ...(placeName ? { placeName: placeName.slice(0, PLACE_MAX) } : null),
    ...(draft.capacity !== null ? { capacity: draft.capacity } : null),
    ...(priceCents !== null ? { priceCents, currency: draft.currency } : null),
    ...(link ? { externalUrl: link } : null),
    waitlistEnabled: draft.waitlist,
    visibility: draft.visibility,
    showOnMap: draft.showOnMap,
    interestIds: draft.interestIds.slice(0, INTERESTS_MAX),
    ...(checklist.length ? { checklist } : null),
    photos: draft.photos.slice(0, PHOTOS_MAX),
  };
}

/** Moves one item of a list, as a drag does. */
export function move<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list.slice();
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item as T);
  return next;
}

/** Picks or unpicks an interest, up to the most a post takes. */
export function toggleInterest(ids: readonly string[], id: string): string[] {
  if (ids.includes(id)) return ids.filter((i) => i !== id);
  return ids.length >= INTERESTS_MAX ? ids.slice() : [...ids, id];
}

/**
 * A saved post back in the wizard's terms, so a draft can be carried on with.
 *
 * Its photos stay their web addresses until they are uploaded again. The price
 * is per person on the server, so a shared cost comes back as that share with
 * one expected traveller — what is sent stays exactly what was saved.
 */
export function draftFromSaved(saved: SavedPost): PostDraft {
  const base = emptyDraft(saved.type);
  const start = saved.startAt ? new Date(saved.startAt) : null;
  const valid = start && !Number.isNaN(start.getTime()) ? start : null;
  const pin = saved.lat !== null && saved.lng !== null ? { lat: saved.lat, lng: saved.lng } : null;
  const city =
    needsCity(saved.type) && saved.city && pin
      ? { id: saved.city.id, name: saved.city.name, label: saved.city.label, lat: pin.lat, lng: pin.lng }
      : null;
  const currency = saved.currency === 'USD' ? 'USD' : 'NGN';
  return {
    ...base,
    photos: saved.imageUrls.slice(0, PHOTOS_MAX).map((uri, i) => ({
      key: `saved-${saved.id}-${i}`,
      uri,
      name: `photo-${i + 1}.jpg`,
      type: 'image/jpeg' as const,
    })),
    title: saved.title,
    description: saved.description,
    city,
    date: valid ? new Date(valid.getFullYear(), valid.getMonth(), valid.getDate()) : null,
    startTime: valid,
    place: city && saved.placeName === city.label ? '' : (saved.placeName ?? ''),
    placeCoords: pin,
    notes:
      saved.type === 'plan' && saved.checklist.length
        ? saved.checklist.map((text, i) => ({ key: `saved-note-${i}`, text }))
        : base.notes,
    capacity: saved.capacity ?? (saved.type === 'event' ? null : base.capacity),
    visibility: saved.visibility,
    showOnMap: saved.showOnMap,
    waitlist: saved.waitlistEnabled,
    costOn: saved.priceCents !== null,
    currency,
    amount: saved.priceCents !== null ? String(Math.round(saved.priceCents / 100)) : '',
    expected: saved.priceCents !== null && saved.type !== 'event' ? '1' : base.expected,
    externalUrl: saved.externalUrl ?? '',
    interestIds: saved.interestIds.slice(0, INTERESTS_MAX),
  };
}
