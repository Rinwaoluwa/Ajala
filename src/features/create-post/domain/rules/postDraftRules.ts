import type { PostKind } from '../postKinds';
import {
  emptyDraft,
  type Currency,
  type PostDraft,
  type PostSubmission,
  type SavedPost,
} from '../entities/PostDraft';

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
/**
 * A line of an Event's schedule or a Plan's itinerary, and the most lines one
 * takes. The API states no limit for either yet (spec §8.4: "up to  lines", the
 * number missing), so these are the wizard's own until the backend says.
 */
export const NOTE_MAX = 120;
export const NOTES_MAX = 30;
export const INTERESTS_MIN = 1;
export const INTERESTS_MAX = 3;
export const EXTERNAL_URL_MAX = 2048;
/** `priceCents` is 1–100,000,000 in the smallest unit (spec §4). */
const PRICE_CENTS_MAX = 100_000_000;
/** `costTotalCents` is up to 1,000,000,000 and `expectedCount` 1–100,000 (spec §4). */
const COST_TOTAL_CENTS_MAX = 1_000_000_000;
export const EXPECTED_MAX = 100_000;
/** A monthly Group starts on the 1st to the 28th, so every month has its day (spec §2.12). */
export const MONTHLY_LAST_DAY = 28;
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
  | 'recurrence'
  | 'recurrenceEndsOn'
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
  | 'totalRange'
  | 'expectedRange'
  | 'monthlyDay'
  | 'endsBeforeStart'
  | 'notHttps'
  | 'interestCount';

export type DraftIssues = Partial<Record<DraftField, DraftIssue>>;

/** Plans and Groups happen in a city chosen on the first step; Meetups and Events at a pin. */
export const needsCity = (kind: PostKind) => kind === 'plan' || kind === 'group';
/** A Meetup or Event cannot publish without a pin (spec §2.12). */
export const needsPin = (kind: PostKind) => kind === 'meetup' || kind === 'event';
/**
 * Which types have a list of lines: an Event's schedule and a Plan's itinerary.
 * The API takes no list for a Meetup or Group, and 400s one sent on them.
 */
export const hasLines = (kind: PostKind) => kind === 'event' || kind === 'plan';
/**
 * Plans and Groups split a total between the people expected; Meetups and
 * Events charge a price per person. The API refuses a split on a Meetup or Event.
 */
export const sharesCost = (kind: PostKind) => kind === 'plan' || kind === 'group';
/** Only a Group meets again (spec §2.12 `recurrence`). */
export const canRepeat = (kind: PostKind) => kind === 'group';

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

/** A Meetup's or Event's price per person in the smallest unit, as `priceCents` (spec §1.5). */
export function priceCentsOf(draft: PostDraft): number | null {
  if (sharesCost(draft.kind)) return null;
  const amount = parseWhole(draft.amount);
  if (amount === null) return null;
  const cents = amount * MINOR_UNITS;
  return cents >= 1 && cents <= PRICE_CENTS_MAX ? cents : null;
}

/**
 * A Plan's or Group's shared cost as the API takes it: the whole total in the
 * smallest unit and the number it is split between (spec §1.5). Null until both
 * are typed and in range. The split itself is the server's to work out.
 */
export function costOf(
  draft: PostDraft,
): { totalCents: number; currency: Currency; expectedCount: number } | null {
  if (!sharesCost(draft.kind)) return null;
  const total = parseWhole(draft.amount);
  const people = parseWhole(draft.expected);
  if (total === null || people === null) return null;
  const totalCents = total * MINOR_UNITS;
  if (totalCents > COST_TOTAL_CENTS_MAX || people > EXPECTED_MAX) return null;
  return { totalCents, currency: draft.currency, expectedCount: people };
}

/**
 * What each person pays, in whole units, for the wizard to show before the post
 * is sent. A price is already per person. A shared cost is a preview only: it
 * rounds up the way the server says it does, but what travellers see is the
 * server's own `costSplit.perPersonCents`.
 */
export function previewEach(draft: PostDraft): number | null {
  const amount = parseWhole(draft.amount);
  if (amount === null) return null;
  if (!sharesCost(draft.kind)) return amount;
  const people = parseWhole(draft.expected);
  return people === null ? null : Math.ceil(amount / people);
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
    `${toIsoDate(date)}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:00` +
    `${sign}${pad(offset / 60)}:${pad(offset % 60)}`
  );
}

/** "2026-10-22": a calendar day as the API writes one (`recurrenceEndsOn`). */
export function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** A "YYYY-MM-DD" day at local midnight, or null when it is not one. */
export function fromIsoDate(text: string | null): Date | null {
  const m = text ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(text) : null;
  if (!m) return null;
  const day = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(day.getTime()) ? null : day;
}

const dayNumber = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

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
      if (canRepeat(draft.kind) && draft.recurrence) {
        // The server refuses a monthly Group on the 29th to 31st, as some months lack the day.
        if (draft.recurrence === 'monthly' && draft.date && draft.date.getDate() > MONTHLY_LAST_DAY) {
          issues.recurrence = 'monthlyDay';
        }
        if (draft.date && draft.recurrenceEndsOn && dayNumber(draft.recurrenceEndsOn) < dayNumber(draft.date)) {
          issues.recurrenceEndsOn = 'endsBeforeStart';
        }
      }
      break;
    }
    case 'participants':
      if (!isCapacityValid(draft.kind, draft.capacity)) issues.capacity = 'capacityRange';
      break;
    case 'cost':
      if (!draft.costOn) break;
      if (parseWhole(draft.amount) === null) issues.amount = 'required';
      else if (sharesCost(draft.kind)) {
        if ((parseWhole(draft.amount) ?? 0) * MINOR_UNITS > COST_TOTAL_CENTS_MAX) issues.amount = 'totalRange';
      } else if (priceCentsOf(draft) === null) issues.amount = 'amountRange';
      if (sharesCost(draft.kind)) {
        const people = parseWhole(draft.expected);
        if (people === null) issues.expected = 'required';
        else if (people > EXPECTED_MAX) issues.expected = 'expectedRange';
      }
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

/**
 * The step that holds a field the server turned down (`errors[].field` with a
 * 400 VALIDATION_FAILED), so the review step can link to it. A list field may
 * come back with its index ("itinerary[2]", "schedule.0"); its name decides.
 * Anything not on a step stays on the review step.
 */
const FIELD_STEPS: Partial<Record<string, WizardStep>> = {
  images: 'basics',
  title: 'basics',
  description: 'basics',
  cityId: 'basics',
  startAt: 'schedule',
  endAt: 'schedule',
  lat: 'schedule',
  lng: 'schedule',
  placeName: 'schedule',
  schedule: 'schedule',
  itinerary: 'schedule',
  recurrence: 'schedule',
  recurrenceEndsOn: 'schedule',
  capacity: 'participants',
  visibility: 'participants',
  showOnMap: 'participants',
  waitlistEnabled: 'participants',
  priceCents: 'cost',
  currency: 'cost',
  costTotalCents: 'cost',
  costCurrency: 'cost',
  expectedCount: 'cost',
  externalUrl: 'cost',
  interestIds: 'review',
};

export function stepOfField(field: string): WizardStep {
  const name = /^[A-Za-z]+/.exec(field)?.[0] ?? '';
  return FIELD_STEPS[name] ?? 'review';
}

// ---------- what is sent ----------

/** The step-two lines with blanks dropped, trimmed to the wizard's limits. */
const linesOf = (draft: PostDraft) =>
  draft.notes
    .map((n) => n.text.trim().slice(0, NOTE_MAX))
    .filter(Boolean)
    .slice(0, NOTES_MAX);

/**
 * The API's form, built from the draft. Blank fields are left out rather than
 * sent empty, so a draft can be saved half-written, and a field only one type
 * takes is never sent on another (the API 400s it).
 *
 * The pin is the meeting point's, when it was found. A Plan or Group without one
 * names its city instead; with one, the pin decides the city (spec §2.12).
 */
export function toSubmission(draft: PostDraft): PostSubmission {
  const start = startOf(draft);
  const end = endOf(draft);
  const pin = draft.placeCoords;
  const placeName = draft.place.trim();
  const priceCents = draft.costOn ? priceCentsOf(draft) : null;
  const cost = draft.costOn ? costOf(draft) : null;
  const lines = hasLines(draft.kind) ? linesOf(draft) : [];
  const link = draft.costOn ? draft.externalUrl.trim() : '';
  const repeat = canRepeat(draft.kind) ? draft.recurrence : null;

  return {
    type: draft.kind,
    title: draft.title.trim().slice(0, TITLE_MAX),
    ...(draft.description.trim() ? { description: draft.description.trim() } : null),
    ...(start ? { startAt: toIsoWithOffset(start) } : null),
    // An end before the start is held on step two; a half-written draft saves without it.
    ...(start && end && end.getTime() > start.getTime() ? { endAt: toIsoWithOffset(end) } : null),
    ...(pin ? { lat: pin.lat, lng: pin.lng } : null),
    ...(!pin && needsCity(draft.kind) && draft.city ? { cityId: draft.city.id } : null),
    ...(placeName ? { placeName: placeName.slice(0, PLACE_MAX) } : null),
    ...(draft.capacity !== null ? { capacity: draft.capacity } : null),
    ...(priceCents !== null ? { priceCents, currency: draft.currency } : null),
    ...(cost ? { cost } : null),
    ...(link ? { externalUrl: link } : null),
    waitlistEnabled: draft.waitlist,
    visibility: draft.visibility,
    showOnMap: draft.showOnMap,
    interestIds: draft.interestIds.slice(0, INTERESTS_MAX),
    ...(lines.length && draft.kind === 'event' ? { schedule: lines } : null),
    ...(lines.length && draft.kind === 'plan' ? { itinerary: lines } : null),
    ...(repeat
      ? {
          recurrence: {
            frequency: repeat,
            ...(draft.recurrenceEndsOn ? { endsOn: toIsoDate(draft.recurrenceEndsOn) } : null),
          },
        }
      : null),
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
 * Its photos stay their web addresses until they are uploaded again. A Plan or
 * Group saved before the API split costs itself carried each person's share as
 * its price; that comes back as a total for one person, so nothing is lost and
 * the next save sends it as a shared cost.
 */
export function draftFromSaved(saved: SavedPost): PostDraft {
  const base = emptyDraft(saved.type);
  const start = moment(saved.startAt);
  const end = moment(saved.endAt);
  const pin = saved.lat !== null && saved.lng !== null ? { lat: saved.lat, lng: saved.lng } : null;
  const city =
    needsCity(saved.type) && saved.city
      ? { id: saved.city.id, name: saved.city.name, label: saved.city.label }
      : null;
  const lines = saved.type === 'event' ? saved.schedule : saved.type === 'plan' ? saved.itinerary : [];
  const repeat = canRepeat(saved.type) ? saved.recurrence : null;
  const money = savedMoney(saved);
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
    date: start ? new Date(start.getFullYear(), start.getMonth(), start.getDate()) : null,
    startTime: start,
    endTime: end,
    // Older drafts wrote the city's name as the meeting point when there was none.
    place: city && saved.placeName === city.label ? '' : (saved.placeName ?? ''),
    placeCoords: pin,
    notes: lines.length ? lines.map((text, i) => ({ key: `saved-note-${i}`, text })) : base.notes,
    recurrence: repeat?.frequency ?? null,
    recurrenceEndsOn: repeat ? fromIsoDate(repeat.endsOn) : null,
    capacity: saved.capacity ?? (saved.type === 'event' ? null : base.capacity),
    visibility: saved.visibility,
    showOnMap: saved.showOnMap,
    waitlist: saved.waitlistEnabled,
    ...(money ?? null),
    externalUrl: saved.externalUrl ?? '',
    interestIds: saved.interestIds.slice(0, INTERESTS_MAX),
  };
}

function moment(iso: string | null): Date | null {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

/** The cost step's fields from a saved post, or null when it was free. */
function savedMoney(saved: SavedPost): Partial<PostDraft> | null {
  const currencyOf = (c: string | null): Currency => (c === 'USD' ? 'USD' : 'NGN');
  const whole = (cents: number) => String(Math.round(cents / MINOR_UNITS));
  if (sharesCost(saved.type) && saved.costSplit) {
    return {
      costOn: true,
      currency: currencyOf(saved.costSplit.currency),
      amount: whole(saved.costSplit.totalCents),
      expected: String(saved.costSplit.expectedCount),
    };
  }
  if (saved.priceCents === null) return null;
  return {
    costOn: true,
    currency: currencyOf(saved.currency),
    amount: whole(saved.priceCents),
    ...(sharesCost(saved.type) ? { expected: '1' } : null),
  };
}
