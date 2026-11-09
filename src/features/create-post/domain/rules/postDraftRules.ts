import type { PostKind } from '../postKinds';
import {
  emptyDraft,
  type Coordinates,
  type DraftPlace,
  type PostDraft,
  type PostSubmission,
  type SavedPost,
} from '../entities/PostDraft';

/**
 * The create wizard's rules, from the API's publish rules and field limits
 * (spec §2.12, §4; API map §5). The server has the last word — it re-checks
 * everything on Publish — but checking here saves a round trip per mistake.
 */

export const PHOTOS_MIN = 2;
export const PHOTOS_MAX = 4;
/** The design says 100; the API takes 80 (API map §5: "use 80"). */
export const TITLE_MAX = 80;
/** The design's limit; the API takes up to 1000. */
export const DESCRIPTION_MAX = 500;
export const PLACE_MAX = 200;
/**
 * A line of an Event's schedule or a Plan's itinerary, and the most lines one
 * takes (backend answers A2). The API answers anything over either with a 400
 * on that field, so the wizard holds the step rather than cutting lines short.
 */
export const NOTE_MAX = 120;
export const NOTES_MAX = 30;
export const INTERESTS_MIN = 1;
export const INTERESTS_MAX = 3;
export const EXTERNAL_URL_MAX = 2048;
/** `priceCents` is 1–100,000,000 in the smallest unit (spec §4). */
const PRICE_CENTS_MAX = 100_000_000;
/** A monthly Group starts on the 1st to the 28th, so every month has its day (spec §2.12). */
export const MONTHLY_LAST_DAY = 28;
/** NGN (kobo) and USD (cents) both have two decimal places. */
const MINOR_UNITS = 100;

/** Every step there is, in order. A Plan skips the price step: see `stepsFor`. */
export type WizardStep = 'basics' | 'schedule' | 'participants' | 'price' | 'review';
export const STEPS: readonly WizardStep[] = ['basics', 'schedule', 'participants', 'price', 'review'];

export type DraftField =
  | 'photos'
  | 'title'
  | 'description'
  | 'destination'
  | 'date'
  | 'startTime'
  | 'endTime'
  | 'place'
  | 'notes'
  | 'recurrence'
  | 'recurrenceEndsOn'
  | 'capacity'
  | 'price'
  | 'externalUrl'
  | 'interests';

/** What is wrong with a field, for the screen to put into words. */
export type DraftIssue =
  | 'required'
  | 'tooFewPhotos'
  | 'inPast'
  | 'endBeforeStart'
  | 'capacityRange'
  | 'priceRange'
  | 'tooManyLines'
  | 'lineTooLong'
  | 'monthlyDay'
  | 'endsBeforeStart'
  | 'notHttps'
  | 'interestCount';

export type DraftIssues = Partial<Record<DraftField, DraftIssue>>;

/**
 * Every post needs a place to publish (spec §2.12, "a place for every type").
 * A Plan or Group gets one from the destination picked on the first step, so
 * its meeting point is optional; a Meetup or Event has only its meeting point
 * (or venue), so that is required.
 */
export const needsDestination = (kind: PostKind) => kind === 'plan' || kind === 'group';
export const needsMeetingPoint = (kind: PostKind) => !needsDestination(kind);
/**
 * Which types have a list of lines: an Event's schedule and a Plan's itinerary.
 * The API takes no list for a Meetup or Group, and 400s one sent on them.
 */
export const hasLines = (kind: PostKind) => kind === 'event' || kind === 'plan';
/**
 * Which types can have a price and a link. Plans carry no money (backend answers
 * C1/C2): each stop can cost something different, so people settle it in the
 * group chat, and the API 400s `priceCents`, `currency` or `externalUrl` on one.
 */
export const hasPrice = (kind: PostKind) => kind !== 'plan';
/** Only a Group meets again (spec §2.12 `recurrence`). */
export const canRepeat = (kind: PostKind) => kind === 'group';

const STEPS_WITHOUT_PRICE: readonly WizardStep[] = STEPS.filter((s) => s !== 'price');

/**
 * The steps a type's wizard walks through: every one, less the price step for a
 * Plan. The same list each call, so the screen can depend on it.
 */
export function stepsFor(kind: PostKind): readonly WizardStep[] {
  return hasPrice(kind) ? STEPS : STEPS_WITHOUT_PRICE;
}

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
 * The price per person in the smallest unit, as `priceCents` (spec §1.5). Null
 * when there is none — left blank, skipped, out of range, or on a Plan.
 */
export function priceCentsOf(draft: PostDraft): number | null {
  if (!hasPrice(draft.kind)) return null;
  const amount = parseWhole(draft.price);
  if (amount === null) return null;
  const cents = amount * MINOR_UNITS;
  return cents >= 1 && cents <= PRICE_CENTS_MAX ? cents : null;
}

/** The price in whole units, for the screen to show; null when there is none. */
export function priceOf(draft: PostDraft): number | null {
  const cents = priceCentsOf(draft);
  return cents === null ? null : cents / MINOR_UNITS;
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

// ---------- what each step needs ----------

/** What stops a step from moving on. Empty when it can. */
export function stepIssues(draft: PostDraft, step: WizardStep, now: Date = new Date()): DraftIssues {
  const issues: DraftIssues = {};
  switch (step) {
    case 'basics':
      if (draft.photos.length < PHOTOS_MIN) issues.photos = 'tooFewPhotos';
      if (!draft.title.trim()) issues.title = 'required';
      if (!draft.description.trim()) issues.description = 'required';
      if (needsDestination(draft.kind) && !draft.destination) issues.destination = 'required';
      break;
    case 'schedule': {
      if (!draft.date) issues.date = 'required';
      if (!draft.startTime) issues.startTime = 'required';
      const start = startOf(draft);
      if (start && start.getTime() <= now.getTime()) issues.startTime = 'inPast';
      const end = endOf(draft);
      if (start && end && end.getTime() <= start.getTime()) issues.endTime = 'endBeforeStart';
      if (needsMeetingPoint(draft.kind) && !draft.place.trim()) issues.place = 'required';
      if (hasLines(draft.kind)) {
        // The typing caps make these hard to reach; a draft saved elsewhere can still bring them.
        const lines = linesOf(draft);
        if (lines.length > NOTES_MAX) issues.notes = 'tooManyLines';
        else if (lines.some((line) => line.length > NOTE_MAX)) issues.notes = 'lineTooLong';
      }
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
    case 'price':
      // Both are optional, a paid Event's link included (backend answers C1/C2):
      // only something typed that the API would refuse holds the step.
      if (!hasPrice(draft.kind)) break;
      if (draft.price.trim() && priceCentsOf(draft) === null) issues.price = 'priceRange';
      if (draft.externalUrl.trim() && !isHttpsUrl(draft.externalUrl)) issues.externalUrl = 'notHttps';
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
  return stepsFor(draft.kind).find((step) => !canLeaveStep(draft, step, now)) ?? null;
}

/** A draft needs only a type and a title (spec §2.12). */
export const canSaveDraft = (draft: PostDraft) => draft.title.trim().length > 0;

/**
 * The step that holds a field the server turned down (`errors[].field` with a
 * 400 VALIDATION_FAILED), so the review step can link to it. A list field may
 * come back with its index ("itinerary[2]", "schedule.0"); its name decides.
 * Anything not on one of this type's steps stays on the review step.
 */
const FIELD_STEPS: Partial<Record<string, WizardStep>> = {
  images: 'basics',
  title: 'basics',
  description: 'basics',
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
  priceCents: 'price',
  currency: 'price',
  externalUrl: 'price',
  interestIds: 'review',
};

export function stepOfField(field: string, kind: PostKind): WizardStep {
  const name = /^[A-Za-z]+/.exec(field)?.[0] ?? '';
  // "A place is needed" comes back on `placeId`. A Plan or Group always has its
  // destination on step one; a Meetup's or Event's place is its meeting point.
  const step =
    name === 'placeId' ? (needsDestination(kind) ? 'basics' : 'schedule') : (FIELD_STEPS[name] ?? 'review');
  // A Plan has no price step to send someone to.
  return stepsFor(kind).includes(step) ? step : 'review';
}

// ---------- what is sent ----------

/**
 * The step-two lines with blanks dropped. Not cut to the limits: a line or list
 * over them is held on step two, and the API 400s it rather than lose words.
 */
function linesOf(draft: PostDraft): string[] {
  return draft.notes.map((n) => n.text.trim()).filter(Boolean);
}

/**
 * Where the post is, as the API takes it: a Google place id or a pin, never
 * both (spec §2.12). The most exact one wins:
 *
 *   1. the venue picked for the meeting point (`placeId`; the server looks up
 *      its coordinates and address, so a picked venue is never sent as a pin);
 *   2. the pin the phone found for a typed meeting point (`lat` + `lng`);
 *   3. a Plan's or Group's destination city (`placeId`).
 *
 * Null when there is none yet, or only a destination read back from a draft
 * without its Google id: the post then keeps whatever place it already has, as
 * the API cannot clear one (`lat`/`lng` are not nullable).
 */
export function placeOf(draft: PostDraft): { placeId: string } | Coordinates | null {
  if (draft.venue?.placeId) return { placeId: draft.venue.placeId };
  if (draft.placeCoords) return { lat: draft.placeCoords.lat, lng: draft.placeCoords.lng };
  if (needsDestination(draft.kind) && draft.destination?.placeId) return { placeId: draft.destination.placeId };
  return null;
}

/**
 * The label under the card: the meeting point as typed or picked, or for a Plan
 * or Group with none, the destination's name (what the server would choose).
 */
function placeNameOf(draft: PostDraft): string {
  const typed = draft.place.trim();
  if (typed) return typed;
  return needsDestination(draft.kind) ? (draft.destination?.name.trim() ?? '') : '';
}

/**
 * The API's form, built from the draft. Blank fields are left out rather than
 * sent empty, so a draft can be saved half-written, and a field only one type
 * takes is never sent on another (the API 400s it).
 */
export function toSubmission(draft: PostDraft): PostSubmission {
  const start = startOf(draft);
  const end = endOf(draft);
  const where = placeOf(draft);
  const placeName = placeNameOf(draft);
  // Plans carry no money: no price, currency or link is ever sent on one.
  const priceCents = priceCentsOf(draft);
  const lines = hasLines(draft.kind) ? linesOf(draft) : [];
  const link = hasPrice(draft.kind) ? draft.externalUrl.trim() : '';
  const repeat = canRepeat(draft.kind) ? draft.recurrence : null;

  return {
    type: draft.kind,
    title: draft.title.trim().slice(0, TITLE_MAX),
    ...(draft.description.trim() ? { description: draft.description.trim() } : null),
    ...(start ? { startAt: toIsoWithOffset(start) } : null),
    // An end before the start is held on step two; a half-written draft saves without it.
    ...(start && end && end.getTime() > start.getTime() ? { endAt: toIsoWithOffset(end) } : null),
    ...where,
    ...(placeName ? { placeName: placeName.slice(0, PLACE_MAX) } : null),
    ...(draft.capacity !== null ? { capacity: draft.capacity } : null),
    ...(priceCents !== null ? { priceCents, currency: draft.currency } : null),
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

/** "Lagos" from "Lagos, Nigeria". */
const cityOf = (localityLabel: string | null) => localityLabel?.split(',')[0]?.trim() ?? '';

/**
 * A saved post's one place back in the wizard's two fields: the meeting point
 * (a venue, or a typed place with its pin) and, for a Plan or Group, the
 * destination.
 *
 * The API keeps a single place per post. When a Plan's or Group's label is just
 * its city's name (`placeName` left to the server, or the destination's name as
 * the wizard sends it), that place is the destination itself and keeps its
 * Google id. Otherwise it is the meeting point, and the destination is rebuilt
 * from `localityLabel` without an id: enough to show and to pass step one, and
 * never sent, so the post keeps the place it has.
 */
function placesFromSaved(saved: SavedPost): Pick<PostDraft, 'destination' | 'place' | 'venue' | 'placeCoords'> {
  const coords = saved.lat !== null && saved.lng !== null ? { lat: saved.lat, lng: saved.lng } : null;
  const label = saved.placeName?.trim() ?? '';
  const city = cityOf(saved.localityLabel);
  const savedPlace: DraftPlace | null = saved.placeId
    ? { placeId: saved.placeId, name: label || city, address: saved.formattedAddress ?? saved.localityLabel ?? '', coords }
    : null;

  if (needsDestination(saved.type)) {
    const isDestination = !label || (city !== '' && label === city);
    if (isDestination && (savedPlace || city)) {
      return {
        destination: savedPlace ?? { placeId: null, name: city, address: saved.localityLabel ?? '', coords: null },
        place: '',
        venue: null,
        placeCoords: null,
      };
    }
    return {
      destination: city ? { placeId: null, name: city, address: saved.localityLabel ?? '', coords: null } : null,
      place: label,
      venue: savedPlace,
      placeCoords: savedPlace ? null : coords,
    };
  }
  return { destination: null, place: label, venue: savedPlace, placeCoords: savedPlace ? null : coords };
}

/**
 * A saved post back in the wizard's terms, so a draft can be carried on with.
 *
 * Its photos stay their web addresses until they are uploaded again. A shared
 * cost saved before it left the API is gone (the API no longer returns it), and
 * a Plan's old price is dropped, since a Plan can no longer carry one.
 */
export function draftFromSaved(saved: SavedPost): PostDraft {
  const base = emptyDraft(saved.type);
  const start = moment(saved.startAt);
  const end = moment(saved.endAt);
  const lines = saved.type === 'event' ? saved.schedule : saved.type === 'plan' ? saved.itinerary : [];
  const repeat = canRepeat(saved.type) ? saved.recurrence : null;
  const priced = hasPrice(saved.type);
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
    ...placesFromSaved(saved),
    date: start ? new Date(start.getFullYear(), start.getMonth(), start.getDate()) : null,
    startTime: start,
    endTime: end,
    notes: lines.length ? lines.map((text, i) => ({ key: `saved-note-${i}`, text })) : base.notes,
    recurrence: repeat?.frequency ?? null,
    recurrenceEndsOn: repeat ? fromIsoDate(repeat.endsOn) : null,
    capacity: saved.capacity ?? (saved.type === 'event' ? null : base.capacity),
    visibility: saved.visibility,
    showOnMap: saved.showOnMap,
    waitlist: saved.waitlistEnabled,
    price: priced && saved.priceCents !== null ? String(Math.round(saved.priceCents / MINOR_UNITS)) : '',
    currency: priced && saved.currency === 'USD' ? 'USD' : 'NGN',
    externalUrl: priced ? (saved.externalUrl ?? '') : '',
    interestIds: saved.interestIds.slice(0, INTERESTS_MAX),
  };
}

function moment(iso: string | null): Date | null {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
}
