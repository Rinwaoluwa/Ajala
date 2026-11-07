import { ApiError, type ApiErrorCode } from '../api/ApiError';
import {
  DEMO_CITIES,
  DEMO_HOST_DETAILS,
  DEMO_HOSTS,
  DEMO_INTERESTS,
  DEMO_POST_SEEDS,
  images,
  type DemoCity,
} from './demoData';

/**
 * The demo world and the routes every area shares — see `demoApi.ts` for how a
 * request is answered. A pretend Ajala API for demos and UI testing, switched on with
 * `EXPO_PUBLIC_DEMO=1` (see docs/DEMO.md). `apiClient` hands every request
 * here instead of the network, so every feature runs its real repositories,
 * mappers and caches against answers shaped exactly like the API's (spec §6).
 *
 * It keeps its state in memory for as long as the app runs: a post you publish
 * appears on the feed and the map, an RSVP sticks, a save shows on every card,
 * a second report is refused. Restarting the app starts the world again.
 *
 * Any email and password sign in to a finished profile in Lagos, with Travel on
 * (a complimentary subscription) so teleporting can be tried. Signing up works
 * too: any 6-digit code verifies it, and profile setup follows.
 */

export type DemoRequest = {
  method: string;
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
};

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

// ---------- state ----------

export type DemoRecurrence = 'weekly' | 'biweekly' | 'monthly';

export type DemoPost = {
  id: string;
  type: 'meetup' | 'event' | 'plan' | 'group';
  /** The API also has `taken_down`, which only a moderator sets; the demo has none. */
  status: 'draft' | 'published' | 'cancelled';
  title: string;
  description: string;
  startAt: string | null;
  /** Optional, after `startAt`. Optional here too, so area files' posts need not set it. */
  endAt?: string | null;
  placeName: string | null;
  lat: number | null;
  lng: number | null;
  cityId: string;
  capacity: number | null;
  goingCount: number;
  priceCents: number | null;
  currency: string | null;
  externalUrl: string | null;
  visibility: 'open' | 'private';
  showOnMap: boolean;
  waitlistEnabled: boolean;
  images: ReturnType<typeof images>;
  hostIndex: number | 'me';
  interestIds: string[];
  /** An Event's running order. */
  schedule?: string[];
  /** A Plan's stops, in order. */
  itinerary?: string[];
  /** A Plan or Group sharing a cost; the per-person figure is worked out when it is sent. */
  cost?: { totalCents: number; currency: string; expectedCount: number } | null;
  /** A Group that meets again. */
  recurrence?: { frequency: DemoRecurrence; endsOn: string | null } | null;
  rsvpState: 'none' | 'requested' | 'going' | 'waitlisted';
  reported: boolean;
};

export type DemoIdentity = 'email' | 'google' | 'apple';

export type DemoMe = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  handle: string | null;
  dob: string | null;
  gender: string | null;
  avatarUrl: string | null;
  bio: string | null;
  homeCityId: string | null;
  interestIds: string[];
  extras: Record<string, unknown>;
  profileCompletedAt: string | null;
  /** The ways in: each one can be unlinked unless it is the last. */
  identities: DemoIdentity[];
};

type DemoSubscription = {
  subscribed: boolean;
  platform: 'apple' | 'google' | 'stripe' | 'comp' | null;
  status: 'active' | 'grace' | 'expired' | 'refunded' | null;
  currentPeriodEnd: string | null;
  autoRenew: boolean;
  manage: 'apple' | 'google' | 'web' | null;
};

const at = (days: number, hour: number, minute: number) => {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return new Date(d.getTime() + days * DAY);
};

/**
 * A seed's start. "Today" posts whose time has already gone move to the same
 * time tomorrow, so the feed, the map and profiles have upcoming posts at any
 * hour (a demo opened at 9pm would otherwise find tonight's posts started).
 */
function seedStart([days, hour, minute]: readonly [number, number, number]): Date {
  const start = at(days, hour, minute);
  return days === 0 && start.getTime() <= Date.now() ? at(1, hour, minute) : start;
}

/** "2026-10-22T18:00:00+01:00", as the API writes times. */
function iso(date: Date): string {
  const pad = (n: number) => String(Math.abs(Math.trunc(n))).padStart(2, '0');
  const offset = -date.getTimezoneOffset();
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:00` +
    `${offset >= 0 ? '+' : '-'}${pad(offset / 60)}:${pad(offset % 60)}`
  );
}

/**
 * Where the demo person already stands, so Trips' Upcoming and Requested tabs
 * have something in them before anyone taps Join. Their going count already
 * includes them.
 */
const SEED_RSVPS: Record<string, DemoPost['rsvpState']> = {
  'p-photo-walk': 'going',
  'p-sunday-ride': 'going',
  'p-cultural': 'requested',
};

function seedPosts(): DemoPost[] {
  return DEMO_POST_SEEDS.map((s) => {
    const start = seedStart(s.when);
    return {
      id: s.id,
      type: s.type,
      status: 'published',
      title: s.title,
      description: s.description,
      startAt: iso(start),
      endAt: s.hours ? iso(new Date(start.getTime() + s.hours * HOUR)) : null,
      placeName: s.placeName,
      lat: s.lat,
      lng: s.lng,
      cityId: 'lagos',
      capacity: s.capacity,
      goingCount: s.goingCount,
      priceCents: s.priceNgn === null ? null : s.priceNgn * 100,
      currency: s.priceNgn === null ? null : 'NGN',
      externalUrl: s.externalUrl ?? null,
      visibility: s.visibility,
      showOnMap: true,
      waitlistEnabled: s.waitlistEnabled ?? false,
      images: images(s.id),
      hostIndex: s.host,
      interestIds: s.interests,
      schedule: s.schedule ?? [],
      itinerary: s.itinerary ?? [],
      cost: s.cost
        ? { totalCents: s.cost.totalNgn * 100, currency: 'NGN', expectedCount: s.cost.expectedCount }
        : null,
      recurrence: s.recurrence ? { frequency: s.recurrence, endsOn: null } : null,
      rsvpState: SEED_RSVPS[s.id] ?? 'none',
      reported: false,
    };
  });
}

const finishedProfile = (email: string): DemoMe => ({
  id: 'me',
  email,
  firstName: 'Ada',
  lastName: 'Obi',
  handle: 'ada.travels',
  dob: '1995-04-12',
  gender: 'woman',
  avatarUrl: 'https://i.pravatar.cc/300?img=44',
  bio: 'Solo traveller · coffee + hikes · always up for a museum day',
  homeCityId: 'lagos',
  interestIds: ['food', 'music', 'art'],
  extras: {
    languages: ['en'],
    travelStyles: ['solo', 'foodie', 'culture'],
    favouriteCityIds: ['accra', 'lisbon'],
  },
  profileCompletedAt: new Date(Date.now() - 30 * DAY).toISOString(),
  // Google is linked as well as the password, so unlinking it can be tried.
  identities: ['email', 'google'],
});

/**
 * Travel is on for the demo person, as a complimentary subscription (`comp`, no
 * store to manage it in), so teleporting and the rest of Travel can be tried
 * without a purchase. Buying again through the store calls still answers.
 */
const compSubscription = (): DemoSubscription => ({
  subscribed: true,
  platform: 'comp',
  status: 'active',
  currentPeriodEnd: new Date(Date.now() + 30 * DAY).toISOString(),
  autoRenew: false,
  manage: null,
});

/** Saved before the demo starts, oldest first, so the Saved list has something in it. */
const SEED_SAVES = ['p-jazz', 'p-tarkwa'];

let posts = seedPosts();
let me: DemoMe | null = null;
let nextId = 1;
let subscription = compSubscription();
let teleportCityId: string | null = null;
/** Saved post ids, oldest save first: a Map keeps the order they went in. */
let saves = new Map<string, true>(SEED_SAVES.map((id) => [id, true]));

/** Area files' own state, started again with the world (see `registerReset`). */
const resetters: (() => void)[] = [];

/** Lets an area file start its own state again when the world does. */
export function registerReset(reset: () => void) {
  resetters.push(reset);
}

/** Starts the demo world again (tests, and a sign-out followed by sign-in). */
export function resetDemo() {
  posts = seedPosts();
  me = null;
  nextId = 1;
  subscription = compSubscription();
  teleportCityId = null;
  saves = new Map(SEED_SAVES.map((id) => [id, true]));
  for (const reset of resetters) reset();
}

// ---------- posts kept by the areas ----------

/**
 * Past activities that live with an area rather than in `posts` — what the
 * person attended (Trips), other travellers' histories (Profiles) — so they stay
 * off the feed and the map. Each area registers how to find them by id, so the
 * post page can still open them.
 */
const archiveLookups: ((id: string) => DemoPost | undefined)[] = [];

export function registerArchive(lookup: (id: string) => DemoPost | undefined) {
  archiveLookups.push(lookup);
}

export const archived = (id: string): DemoPost | undefined => {
  for (const lookup of archiveLookups) {
    const found = lookup(id);
    if (found) return found;
  }
  return undefined;
};

/** Any post the demo knows: a live one, a draft, or one an area keeps. */
const findPost = (id: string): DemoPost | undefined => posts.find((p) => p.id === id) ?? archived(id);

/**
 * Other travellers the demo shows — attendees, commenters, chat partners — so
 * tapping one opens a profile rather than "This profile isn't available". Each
 * area remembers the people it draws; Profiles answers `GET /users/:id` from here
 * when the id is not one of the hosts.
 */
export type DemoPerson = { id: string; displayName: string; avatarUrl: string | null; verified?: boolean };
const travellers = new Map<string, DemoPerson>();

export function rememberPerson(person: DemoPerson): DemoPerson {
  travellers.set(person.id, person);
  return person;
}

export const traveller = (id: string): DemoPerson | undefined => travellers.get(id);

// ---------- helpers ----------

const fail = (status: number, code: ApiErrorCode, message: string): never => {
  throw new ApiError({ code, message, status, requestId: 'demo' });
};

type FieldError = { field: string; message: string };

/** A 400 naming each field that failed, as the API sends it (spec §1.2). */
const invalid = (errors: FieldError[], message = 'Some fields need another look.'): never => {
  throw new ApiError({
    code: 'VALIDATION_FAILED',
    message,
    status: 400,
    fieldErrors: errors,
    requestId: 'demo',
  });
};

const cityById = (id: string | null) => DEMO_CITIES.find((c) => c.id === id) ?? null;
const ref = (c: DemoCity) => ({ id: c.id, name: c.name, countryCode: c.countryCode, label: c.label });
const cityDto = (c: DemoCity) => ({
  ...ref(c),
  region: c.region,
  countryName: c.countryName,
  timezone: c.timezone,
  lat: c.lat,
  lng: c.lng,
});

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

function nearestCity(point: { lat: number; lng: number }): DemoCity {
  return DEMO_CITIES.reduce((best, c) => (distanceKm(point, c) < distanceKm(point, best) ? c : best));
}

/** Where the phone is, from `X-Client-Location`, or null without it. */
function clientPoint(headers?: Record<string, string>) {
  const raw = headers?.['X-Client-Location'];
  if (!raw) return null;
  const [lat, lng] = raw.split(',').map(Number);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat: lat as number, lng: lng as number } : null;
}

/**
 * The feed's city, in the API's order (spec §2.11): a teleport while Travel is
 * on, then where the phone is, then the home city, then Lagos. The feed, the
 * map and search all use it.
 */
function feedCity(headers?: Record<string, string>) {
  const teleport = subscription.subscribed ? cityById(teleportCityId) : null;
  if (teleport) return { city: teleport, source: 'teleport' as const };
  const point = clientPoint(headers);
  if (point) return { city: nearestCity(point), source: 'device' as const };
  const home = cityById(me?.homeCityId ?? null);
  return { city: home ?? (cityById('lagos') as DemoCity), source: 'home' as const };
}

function host(p: DemoPost) {
  if (p.hostIndex === 'me') {
    return {
      id: 'me',
      displayName: me ? `${me.firstName ?? 'You'} ${me.lastName?.[0] ?? ''}.`.trim() : 'You',
      avatarUrl: me?.avatarUrl ?? null,
      verified: false,
    };
  }
  return DEMO_HOSTS[p.hostIndex] ?? DEMO_HOSTS[0];
}

/** Currencies with no minor unit: their amounts are already whole (spec §1.5 `exponent`). */
const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'XOF', 'XAF', 'UGX', 'VND', 'CLP', 'ISK', 'RWF']);
const exponentOf = (currency: string) => (ZERO_DECIMAL.has(currency) ? 0 : 2);

/** The split, with the per-person figure rounded up as the API does (spec §1.5). */
function costSplit(p: DemoPost) {
  if (!p.cost) return null;
  const { totalCents, currency, expectedCount } = p.cost;
  return {
    totalCents,
    currency,
    exponent: exponentOf(currency),
    expectedCount,
    perPersonCents: Math.ceil(totalCents / expectedCount),
  };
}

/** `PostCardDto` (spec §6). */
function card(p: DemoPost, headers?: Record<string, string>) {
  const point = clientPoint(headers);
  const c = cityById(p.cityId) ?? (cityById('lagos') as DemoCity);
  return {
    id: p.id,
    type: p.type,
    title: p.title,
    images: p.images,
    startAt: p.startAt,
    endAt: p.endAt ?? null,
    recurrence: p.recurrence ?? null,
    placeName: p.placeName,
    lat: p.lat,
    lng: p.lng,
    city: ref(c),
    capacity: p.capacity,
    price:
      p.priceCents === null
        ? null
        : {
            amountCents: p.priceCents,
            currency: p.currency ?? 'NGN',
            exponent: exponentOf(p.currency ?? 'NGN'),
          },
    costSplit: costSplit(p),
    externalUrl: p.externalUrl,
    joinMode: p.type === 'event' && p.priceCents !== null && p.externalUrl ? 'external' : 'rsvp',
    goingCount: p.goingCount,
    rsvpState: p.rsvpState,
    saved: saves.has(p.id),
    visibility: p.visibility,
    host: host(p),
    interests: DEMO_INTERESTS.filter((i) => p.interestIds.includes(i.id)),
    distanceKm:
      point && p.lat !== null && p.lng !== null ? distanceKm(point, { lat: p.lat, lng: p.lng }) : null,
  };
}

/** `PostDetailDto` (spec §6). */
function detail(p: DemoPost, headers?: Record<string, string>) {
  return {
    ...card(p, headers),
    description: p.description,
    showOnMap: p.showOnMap,
    waitlistEnabled: p.waitlistEnabled,
    status: p.status,
    schedule: p.type === 'event' ? (p.schedule ?? []) : [],
    itinerary: p.type === 'plan' ? (p.itinerary ?? []) : [],
    isHost: p.hostIndex === 'me',
    waitlistPosition: p.rsvpState === 'waitlisted' ? 1 : null,
    linkClickCount: p.hostIndex === 'me' ? 0 : null,
  };
}

function page<T>(items: T[], query: URLSearchParams, maxLimit = 100) {
  const limit = Math.min(Number(query.get('limit') ?? 20) || 20, maxLimit);
  const start = Number(query.get('cursor') ?? 0) || 0;
  const slice = items.slice(start, start + limit);
  return { items: slice, nextCursor: start + limit < items.length ? String(start + limit) : null };
}

const live = () => posts.filter((p) => p.status === 'published');
const soonestFirst = (a: DemoPost, b: DemoPost) => (a.startAt ?? '').localeCompare(b.startAt ?? '');

/**
 * When a post is over: its `endAt`, or three hours after it starts when it has
 * none, so a meetup that started a moment ago still counts as upcoming.
 */
const endsAt = (p: DemoPost) =>
  p.endAt ? new Date(p.endAt).getTime() : p.startAt ? new Date(p.startAt).getTime() + 3 * HOUR : 0;

const signedIn = (): DemoMe => me ?? fail(401, 'UNAUTHORIZED', 'Not signed in (demo).');

const subscriptionDto = () => ({ ...subscription });

function meDto() {
  const m = signedIn();
  const home = cityById(m.homeCityId);
  const favourites = Array.isArray(m.extras.favouriteCityIds) ? (m.extras.favouriteCityIds as string[]) : [];
  return {
    id: m.id,
    status: 'active',
    firstName: m.firstName,
    lastName: m.lastName,
    handle: m.handle,
    dob: m.dob,
    gender: m.gender,
    email: m.email,
    bio: m.bio,
    timezone: 'Africa/Lagos',
    avatarUrl: m.avatarUrl,
    photos: [],
    homeCity: home ? ref(home) : null,
    // Trips left the API; nothing can set this (spec §2.8).
    visiting: null,
    verified: false,
    subscribed: subscription.subscribed,
    subscribedUntil: subscription.subscribed ? subscription.currentPeriodEnd : null,
    interests: DEMO_INTERESTS.filter((i) => m.interestIds.includes(i.id)),
    extras: m.extras,
    favouriteCities: favourites.flatMap((id) => {
      const c = cityById(id);
      return c ? [ref(c)] : [];
    }),
    profileCompletedAt: m.profileCompletedAt,
    identities: m.identities.map((provider) => ({ provider })),
    termsVersion: '2026-01',
    termsUpToDate: true,
    createdAt: new Date(Date.now() - 30 * DAY).toISOString(),
  };
}

/** `TokenPairDto`: what login and refresh answer — no user (spec §2.2). */
function tokenPair() {
  return {
    accessToken: `demo-access-${Date.now()}`,
    refreshToken: `demo-refresh-${Date.now()}`,
    accessExpiresAt: new Date(Date.now() + 365 * DAY).toISOString(),
    sessionId: 'demo-session',
  };
}

/** `OtpSignInDto`: a code or a provider sign-in, with the whole account. */
function signInAnswer(isNew: boolean) {
  return { ...tokenPair(), isNew, user: meDto() };
}

/** The email in an Apple identity token (a JWT), unverified: the demo only shows it. */
function appleEmail(token: string | undefined): string | null {
  try {
    const part = token?.split('.')[1];
    if (!part) return null;
    const json = globalThis.atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    const email = (JSON.parse(json) as { email?: unknown }).email;
    return typeof email === 'string' ? email : null;
  } catch {
    return null;
  }
}

/** The text fields and files of a multipart body, as React Native's FormData holds them. */
function formFields(body: unknown) {
  const parts = ((body as { _parts?: [string, unknown][] } | null)?._parts ?? []) as [string, unknown][];
  const fields: Record<string, string> = {};
  const lists: Record<string, string[]> = {};
  const files: string[] = [];
  for (const [key, value] of parts) {
    if (value && typeof value === 'object' && 'uri' in value)
      files.push(String((value as { uri: string }).uri));
    else {
      fields[key] = String(value);
      (lists[key] ??= []).push(String(value));
    }
  }
  return { fields, lists, files };
}

const localImages = (uris: string[]) => uris.map((uri) => ({ thumbUrl: uri, cardUrl: uri, fullUrl: uri }));

/** Fields only some post types take; sent on another type they are a 400 on that field (spec §2.12). */
const TYPE_ONLY: { field: string; types: DemoPost['type'][]; message: string }[] = [
  { field: 'schedule', types: ['event'], message: 'Only an Event has a schedule.' },
  { field: 'itinerary', types: ['plan'], message: 'Only a Plan has an itinerary.' },
  { field: 'costTotalCents', types: ['plan', 'group'], message: 'Only a Plan or a Group splits a cost.' },
  { field: 'costCurrency', types: ['plan', 'group'], message: 'Only a Plan or a Group splits a cost.' },
  { field: 'expectedCount', types: ['plan', 'group'], message: 'Only a Plan or a Group splits a cost.' },
  { field: 'recurrence', types: ['group'], message: 'Only a Group repeats.' },
  { field: 'recurrenceEndsOn', types: ['group'], message: 'Only a Group repeats.' },
];

/** Whether a field was really sent: null clears and an empty list is nothing, so neither counts. */
const sent = (value: unknown) =>
  value !== undefined && value !== null && !(Array.isArray(value) && value.length === 0);

function typeFieldErrors(type: DemoPost['type'], input: Record<string, unknown>): FieldError[] {
  return TYPE_ONLY.filter((rule) => sent(input[rule.field]) && !rule.types.includes(type)).map(
    ({ field, message }) => ({ field, message }),
  );
}

const RECURRENCES: readonly string[] = ['weekly', 'biweekly', 'monthly'];

/**
 * Applies a create or an edit to `p`, collecting what is wrong with it rather
 * than stopping at the first: the API lists every failing field. The caller
 * works on a copy and keeps it only when nothing failed.
 */
function applyFields(p: DemoPost, f: Record<string, unknown>): FieldError[] {
  const errors: FieldError[] = [];
  const has = (k: string) => f[k] !== undefined;
  const str = (k: string) => (f[k] === null ? null : String(f[k]));
  const num = (k: string) => (f[k] === null ? null : Number(f[k]));
  const bool = (k: string) => String(f[k]) === 'true';
  const list = (k: string) => {
    const value = f[k];
    if (value === null) return [];
    return Array.isArray(value) ? value.map(String) : [String(value)];
  };

  if (has('title')) p.title = str('title') ?? p.title;
  if (has('description')) p.description = str('description') ?? '';
  if (has('startAt')) p.startAt = str('startAt');
  if (has('endAt')) p.endAt = str('endAt');
  if (has('placeName')) p.placeName = str('placeName');
  if (has('capacity')) p.capacity = num('capacity');
  if (has('priceCents') || has('currency')) {
    const priceCents = has('priceCents') ? num('priceCents') : p.priceCents;
    if (p.status !== 'draft' && priceCents !== p.priceCents) {
      errors.push({ field: 'priceCents', message: 'A live post’s price can’t change.' });
    } else {
      p.priceCents = priceCents;
      if (has('currency')) p.currency = str('currency');
    }
  }
  if (has('externalUrl')) p.externalUrl = str('externalUrl');
  if (has('visibility')) p.visibility = str('visibility') === 'private' ? 'private' : 'open';
  if (has('showOnMap')) p.showOnMap = bool('showOnMap');
  if (has('waitlistEnabled')) p.waitlistEnabled = bool('waitlistEnabled');
  if (has('interestIds')) p.interestIds = list('interestIds');
  if (has('schedule')) p.schedule = list('schedule');
  if (has('itinerary')) p.itinerary = list('itinerary');

  // The pin: both or neither, and null on both clears it.
  if (has('lat') !== has('lng')) {
    errors.push({ field: has('lat') ? 'lng' : 'lat', message: 'Send lat and lng together.' });
  } else if (has('lat')) {
    p.lat = num('lat');
    p.lng = num('lng');
  }

  // A pin always decides the city; without one a Plan or Group may name it, else the home city.
  if (has('cityId')) {
    const cityId = str('cityId');
    if (p.lat !== null && p.lng !== null) {
      errors.push({ field: 'cityId', message: 'A pinned post takes its city from the pin.' });
    } else if (cityId === null) {
      p.cityId = me?.homeCityId ?? 'lagos';
    } else if (!cityById(cityId)) {
      errors.push({ field: 'cityId', message: 'Unknown city.' });
    } else {
      p.cityId = cityId;
    }
  }
  if (p.lat !== null && p.lng !== null) p.cityId = nearestCity({ lat: p.lat, lng: p.lng }).id;

  // The cost split: all three together, or null on all three to clear it.
  const costKeys = ['costTotalCents', 'costCurrency', 'expectedCount'];
  if (costKeys.some(has)) {
    if (costKeys.every((k) => f[k] === null)) p.cost = null;
    else if (costKeys.every((k) => f[k] !== undefined && f[k] !== null)) {
      const totalCents = num('costTotalCents') as number;
      const expectedCount = num('expectedCount') as number;
      const currency = String(f.costCurrency);
      if (!Number.isInteger(totalCents) || totalCents < 0 || totalCents > 1_000_000_000)
        errors.push({ field: 'costTotalCents', message: 'Enter a total of 0 or more.' });
      if (!Number.isInteger(expectedCount) || expectedCount < 1 || expectedCount > 100_000)
        errors.push({ field: 'expectedCount', message: 'Split it between at least 1 person.' });
      if (!/^[A-Z]{3}$/.test(currency))
        errors.push({ field: 'costCurrency', message: 'Use a 3-letter currency code.' });
      p.cost = { totalCents, currency, expectedCount };
    } else {
      for (const k of costKeys.filter((key) => f[key] === undefined || f[key] === null))
        errors.push({ field: k, message: 'Send costTotalCents, costCurrency and expectedCount together.' });
    }
  }

  if (has('recurrence')) {
    const frequency = str('recurrence');
    if (frequency === null) p.recurrence = null;
    else if (!RECURRENCES.includes(frequency))
      errors.push({ field: 'recurrence', message: 'Choose weekly, biweekly or monthly.' });
    else p.recurrence = { frequency: frequency as DemoRecurrence, endsOn: p.recurrence?.endsOn ?? null };
  }
  if (has('recurrenceEndsOn')) {
    const endsOn = str('recurrenceEndsOn');
    if (endsOn !== null && !/^\d{4}-\d{2}-\d{2}$/.test(endsOn))
      errors.push({ field: 'recurrenceEndsOn', message: 'Use a date as YYYY-MM-DD.' });
    else if (p.recurrence) p.recurrence = { ...p.recurrence, endsOn };
  }

  if (p.endAt && p.startAt && new Date(p.endAt).getTime() <= new Date(p.startAt).getTime())
    errors.push({ field: 'endAt', message: 'End after it starts.' });
  return errors;
}

/** The publish rules (spec §2.12), so the review step's server errors can be seen too. */
function publishErrors(p: DemoPost) {
  const errors: FieldError[] = [];
  if (!p.startAt || new Date(p.startAt).getTime() <= Date.now())
    errors.push({ field: 'startAt', message: 'Pick a start time in the future.' });
  if (!p.description) errors.push({ field: 'description', message: 'Add a description.' });
  if (p.images.length < 2 || p.images.length > 4)
    errors.push({ field: 'images', message: 'Add 2 to 4 photos.' });
  if (p.interestIds.length < 1 || p.interestIds.length > 3)
    errors.push({ field: 'interestIds', message: 'Pick 1 to 3 interests.' });
  if ((p.type === 'meetup' || p.type === 'event') && (p.lat === null || p.lng === null))
    errors.push({ field: 'lat', message: 'Add a meeting point on the map.' });
  if (p.type === 'event' && p.capacity !== null && p.capacity <= 100)
    errors.push({ field: 'capacity', message: 'An Event is for more than 100 people, or no limit.' });
  if (p.type === 'group' && (p.capacity === null || p.capacity < 1 || p.capacity > 100))
    errors.push({ field: 'capacity', message: 'A Group is for 1 to 100 people.' });
  if (p.type === 'event' && p.priceCents !== null && !p.externalUrl)
    errors.push({ field: 'externalUrl', message: 'A paid event needs a link to pay or book.' });
  if (p.recurrence?.frequency === 'monthly' && p.startAt && new Date(p.startAt).getDate() > 28)
    errors.push({ field: 'startAt', message: 'A monthly Group starts on the 1st to the 28th.' });
  return errors;
}

/** A post's fields from a create: multipart as the app sends it, or plain JSON. */
function createInput(body: unknown) {
  if ((body as { _parts?: unknown } | null)?._parts) {
    const { fields, lists, files } = formFields(body);
    const input: Record<string, unknown> = { ...fields };
    // Repeated fields arrive once per value (spec §2.12).
    for (const key of ['interestIds', 'schedule', 'itinerary']) if (lists[key]) input[key] = lists[key];
    return { input, files };
  }
  return { input: { ...((body as Record<string, unknown> | null) ?? {}) }, files: [] as string[] };
}

/** `interestIds` repeated, as `interestIds[]`, or comma-separated: all mean the same list. */
function idList(query: URLSearchParams, key: string): string[] {
  return [...query.getAll(key), ...query.getAll(`${key}[]`)]
    .flatMap((v) => v.split(','))
    .map((v) => v.trim())
    .filter(Boolean);
}

/** A post card for every saved post, newest save first; drafts never show, cancelled ones stay. */
function savedCards(type: string | null, headers?: Record<string, string>) {
  return [...saves.keys()]
    .reverse()
    .map(findPost)
    .filter((p): p is DemoPost => !!p && p.status !== 'draft')
    .filter((p) => !type || type === 'all' || p.type === type)
    .map((p) => card(p, headers));
}

/** `PersonCardDto` for each host and every traveller the demo has drawn, for people search. */
function searchablePeople() {
  const hosts = DEMO_HOSTS.map((h) => {
    const extra = DEMO_HOST_DETAILS[h.id];
    const home = cityById(extra?.homeCityId ?? null);
    return {
      id: h.id,
      handle: extra?.handle ?? null,
      displayName: h.displayName,
      avatarUrl: h.avatarUrl,
      verified: h.verified,
      homeCity: home ? ref(home) : null,
    };
  });
  const lagos = cityById('lagos') as DemoCity;
  const others = [...travellers.values()]
    .filter((t) => !hosts.some((h) => h.id === t.id))
    .map((t) => ({
      id: t.id,
      // Matches the handle Profiles gives them.
      handle: t.displayName.toLowerCase().replace(/[^a-z]+/g, '.'),
      displayName: t.displayName,
      avatarUrl: t.avatarUrl,
      verified: t.verified ?? false,
      homeCity: ref(lagos),
    }));
  return [...hosts, ...others];
}

// ---------- the routes ----------

export type Handler = (match: RegExpMatchArray, req: DemoRequest, query: URLSearchParams) => unknown;
/** A method, a path pattern and its answer. Each area adds its own in `routes/` (see `routes/index.ts`). */
export type DemoRoute = [string, RegExp, Handler];

/** The routes every area shares: auth, me, cities, feed, map, search, posts, saves, Travel. */
export const baseRoutes: DemoRoute[] = [
  [
    'GET',
    /^\/api\/v1\/app\/config$/,
    () => ({
      termsVersion: '2026-01',
      termsUrl: 'https://ajalatrvl.com/terms',
      privacyUrl: 'https://ajalatrvl.com/privacy',
      faqUrl: 'https://ajalatrvl.com/faq',
      supportEmail: 'support@ajalatrvl.com',
      minAppVersion: { ios: '0.0.0', android: '0.0.0' },
    }),
  ],

  // ----- auth -----
  [
    // Any email and password; the answer is the token pair only, so the app asks GET /me next.
    'POST',
    /^\/api\/v1\/auth\/login$/,
    (_m, req) => {
      const email = String((req.body as { email?: string })?.email ?? 'demo@ajala.app');
      me = finishedProfile(email);
      return tokenPair();
    },
  ],
  [
    'POST',
    /^\/api\/v1\/auth\/signup\/email$/,
    (_m, req) => {
      const b = req.body as { email: string; firstName: string; lastName: string; dob: string };
      me = {
        ...finishedProfile(b.email),
        firstName: b.firstName,
        lastName: b.lastName,
        dob: b.dob,
        handle: null,
        gender: null,
        avatarUrl: null,
        homeCityId: null,
        interestIds: [],
        extras: {},
        profileCompletedAt: null,
        identities: ['email'],
      };
      return undefined;
    },
  ],
  [
    'POST',
    /^\/api\/v1\/auth\/otp\/verify$/,
    (_m, req) => {
      const code = String((req.body as { code?: string })?.code ?? '');
      if (!/^\d{6}$/.test(code)) return invalid([{ field: 'code', message: 'Enter the 6-digit code.' }]);
      me ??= finishedProfile(String((req.body as { target?: string }).target));
      return signInAnswer(me.profileCompletedAt === null);
    },
  ],
  ['POST', /^\/api\/v1\/auth\/otp\/resend$/, () => undefined],
  [
    'POST',
    /^\/api\/v1\/auth\/refresh$/,
    () => {
      me ??= finishedProfile('demo@ajala.app');
      return tokenPair();
    },
  ],
  [
    'POST',
    /^\/api\/v1\/auth\/logout$/,
    () => {
      me = null;
      return undefined;
    },
  ],
  [
    'POST',
    /^\/api\/v1\/auth\/logout\/all$/,
    () => {
      me = null;
      return undefined;
    },
  ],
  ['POST', /^\/api\/v1\/auth\/password\/forgot$/, () => undefined],
  [
    // Any 6 digits are the emailed code; the token it buys works once on /password/reset.
    'POST',
    /^\/api\/v1\/auth\/password\/verify$/,
    (_m, req) => {
      const code = String((req.body as { code?: unknown } | null)?.code ?? '');
      if (!/^\d{6}$/.test(code)) return fail(401, 'UNAUTHORIZED', 'That code is wrong or has expired.');
      return { token: `demo-reset-${Date.now()}` };
    },
  ],
  ['POST', /^\/api\/v1\/auth\/password\/reset$/, () => undefined],
  [
    // Sign in with Apple: the real Apple sheet runs on the phone; the demo takes its
    // token on trust (the API verifies it) and signs in with Apple's name and email.
    'POST',
    /^\/api\/v1\/auth\/oauth\/apple$/,
    (_m, req) => {
      const b = req.body as { identityToken?: string; firstName?: string; lastName?: string };
      const email = appleEmail(b.identityToken) ?? 'apple@ajala.app';
      me ??= {
        ...finishedProfile(email),
        ...(b.firstName ? { firstName: b.firstName } : null),
        ...(b.lastName ? { lastName: b.lastName } : null),
        identities: ['apple'],
      };
      if (!me.identities.includes('apple')) me.identities = [...me.identities, 'apple'];
      return signInAnswer(false);
    },
  ],
  [
    // Linking a provider to an existing account after ACCOUNT_LINK_REQUIRED: any 6 digits.
    'POST',
    /^\/api\/v1\/auth\/oauth\/link$/,
    (_m, req) => {
      const code = String((req.body as { code?: unknown } | null)?.code ?? '');
      if (!/^\d{6}$/.test(code)) return fail(401, 'UNAUTHORIZED', 'That code is wrong or has expired.');
      me ??= finishedProfile('demo@ajala.app');
      return signInAnswer(false);
    },
  ],
  [
    'POST',
    /^\/api\/v1\/auth\/oauth\//,
    () => fail(503, 'SERVICE_UNAVAILABLE', 'Google sign-in is not in the demo. Use email or Apple.'),
  ],

  // ----- me -----
  [
    'GET',
    /^\/api\/v1\/me$/,
    () => {
      // A session restored from the keychain after a restart: the demo world is new, so sign it in again.
      me ??= finishedProfile('demo@ajala.app');
      return meDto();
    },
  ],
  [
    'PATCH',
    /^\/api\/v1\/me$/,
    (_m, req) => {
      const current = signedIn();
      const b = (req.body ?? {}) as Partial<Omit<DemoMe, 'extras'>> & {
        homeCityId?: string | null;
        interestIds?: string[];
        extras?: Record<string, unknown>;
      };
      const extras = { ...current.extras, ...b.extras };
      // An empty list or null clears the travel styles (spec §6 ProfileExtrasDto).
      if (b.extras && 'travelStyles' in b.extras && !sent(b.extras.travelStyles)) {
        delete extras.travelStyles;
      }
      const favourites = extras.favouriteCityIds;
      const unknownCity = Array.isArray(favourites) && favourites.some((id) => !cityById(String(id)));
      if (unknownCity || (Array.isArray(favourites) && favourites.length > 10)) {
        return invalid([{ field: 'extras.favouriteCityIds', message: 'Pick up to 10 cities from the list.' }]);
      }
      if (b.homeCityId && !cityById(b.homeCityId)) {
        return invalid([{ field: 'homeCityId', message: 'Unknown city.' }]);
      }
      me = {
        ...current,
        ...(b.firstName !== undefined ? { firstName: b.firstName } : null),
        ...(b.lastName !== undefined ? { lastName: b.lastName } : null),
        ...(b.dob !== undefined ? { dob: b.dob } : null),
        ...(b.gender !== undefined ? { gender: b.gender } : null),
        ...(b.handle !== undefined ? { handle: b.handle } : null),
        ...(b.bio !== undefined ? { bio: b.bio } : null),
        interestIds: b.interestIds ?? current.interestIds,
        homeCityId: b.homeCityId !== undefined ? b.homeCityId : current.homeCityId,
        extras,
      };
      // Stamped once, by the server: name and date of birth finish a profile; gender is
      // optional (the GET /me description; spec §2.4 and §8 note the field text disagrees).
      if (me.firstName && me.lastName && me.dob && !me.profileCompletedAt) {
        me.profileCompletedAt = new Date().toISOString();
      }
      return meDto();
    },
  ],
  ['POST', /^\/api\/v1\/me\/terms\/accept$/, () => undefined],
  [
    'POST',
    /^\/api\/v1\/me\/avatar$/,
    (_m, req) => {
      const uri = formFields(req.body).files[0] ?? null;
      if (me) me.avatarUrl = uri;
      return { avatarUrl: uri };
    },
  ],
  [
    'DELETE',
    /^\/api\/v1\/me\/avatar$/,
    () => {
      if (me) me.avatarUrl = null;
      return undefined;
    },
  ],
  [
    // Re-auth is not asked for in the demo; the rest is as the API answers (spec §2.3).
    'DELETE',
    /^\/api\/v1\/me\/identities\/([^/]+)$/,
    (m) => {
      const current = signedIn();
      const provider = m[1] as DemoIdentity;
      if (provider !== 'google' && provider !== 'apple')
        return fail(400, 'BAD_REQUEST', 'Only Google or Apple can be unlinked.');
      if (!current.identities.includes(provider)) return fail(404, 'NOT_FOUND', 'Not linked.');
      if (current.identities.length === 1)
        return fail(409, 'LAST_SIGN_IN_METHOD', 'Set a password before removing your only way to sign in.');
      current.identities = current.identities.filter((i) => i !== provider);
      return undefined;
    },
  ],
  [
    'GET',
    /^\/api\/v1\/handles\/availability$/,
    (_m, _r, q) => {
      const handle = q.get('handle') ?? '';
      if (!/^[a-z0-9._]{3,20}$/i.test(handle)) return { available: false, reason: 'format' };
      return ['ajala', 'admin', 'taken'].includes(handle.toLowerCase())
        ? { available: false, reason: 'taken' }
        : { available: true, reason: null };
    },
  ],

  // ----- my lists -----
  [
    // Trips' Upcoming (going, not yet over) and Requested tabs, soonest first.
    'GET',
    /^\/api\/v1\/me\/rsvps$/,
    (_m, req, q) => {
      const state = q.get('state') ?? 'going';
      if (state !== 'going' && state !== 'requested')
        return invalid([{ field: 'state', message: 'state is going or requested.' }]);
      const now = Date.now();
      const items = live()
        .filter((p) => p.rsvpState === state && (state !== 'going' || endsAt(p) > now))
        .sort(soonestFirst)
        .map((p) => card(p, req.headers));
      return page(items, q);
    },
  ],
  [
    'GET',
    /^\/api\/v1\/me\/saved$/,
    (_m, req, q) => page(savedCards(q.get('type'), req.headers), q),
  ],

  // ----- cities and interests -----
  [
    'GET',
    /^\/api\/v1\/cities\/resolve$/,
    (_m, _r, q) => {
      const point = { lat: Number(q.get('lat')), lng: Number(q.get('lng')) };
      const c = nearestCity(point);
      return { city: cityDto(c), distanceKm: distanceKm(point, c) };
    },
  ],
  [
    // Up to 12 cities with the most live posts first; the rest keep the list's order.
    'GET',
    /^\/api\/v1\/cities\/popular$/,
    () => {
      const count = (c: DemoCity) => live().filter((p) => p.cityId === c.id).length;
      return [...DEMO_CITIES]
        .sort((a, b) => count(b) - count(a))
        .slice(0, 12)
        .map(cityDto);
    },
  ],
  [
    'GET',
    /^\/api\/v1\/cities$/,
    (_m, _r, q) => {
      const term = (q.get('q') ?? '').trim().toLowerCase();
      const limit = Math.min(Number(q.get('limit') ?? 10) || 10, 20);
      return DEMO_CITIES.filter((c) => `${c.name} ${c.countryName}`.toLowerCase().includes(term))
        .sort(
          (a, b) =>
            Number(!a.name.toLowerCase().startsWith(term)) - Number(!b.name.toLowerCase().startsWith(term)),
        )
        .slice(0, limit)
        .map(cityDto);
    },
  ],
  [
    'GET',
    /^\/api\/v1\/cities\/([^/]+)$/,
    (m) => {
      const c = cityById(m[1] ?? null);
      return c ? cityDto(c) : fail(404, 'NOT_FOUND', 'No such city.');
    },
  ],
  ['GET', /^\/api\/v1\/interests$/, () => DEMO_INTERESTS],

  // ----- feed, map, search -----
  [
    'GET',
    /^\/api\/v1\/feed$/,
    (_m, req, q) => {
      const { city, source } = feedCity(req.headers);
      const type = q.get('type') ?? 'all';
      const items = live()
        .filter((p) => p.cityId === city.id && (type === 'all' || p.type === type))
        .sort(soonestFirst)
        .map((p) => card(p, req.headers));
      return { ...page(items, q), city: ref(city), citySource: source };
    },
  ],
  [
    'GET',
    /^\/api\/v1\/map\/pins$/,
    (_m, req, q) => {
      const [west, south, east, north] = (q.get('bbox') ?? '').split(',').map(Number) as number[];
      if ([west, south, east, north].some((n) => !Number.isFinite(n)))
        return fail(400, 'BAD_REQUEST', 'bbox is west,south,east,north.');
      const [w, s, e, n] = [west, south, east, north] as [number, number, number, number];
      if (w >= e || s >= n) return fail(400, 'BAD_REQUEST', 'bbox is inside out.');
      if (e - w > 5 || n - s > 5) return fail(400, 'BAD_REQUEST', 'bbox must be at most 5° a side.');
      const type = q.get('type');
      const term = (q.get('q') ?? '').trim().toLowerCase();
      if (term.length > 80) return invalid([{ field: 'q', message: 'Search up to 80 characters.' }]);
      const { city, source } = feedCity(req.headers);
      const pins = live()
        .filter((p) => p.showOnMap && p.lat !== null && p.lng !== null && p.startAt)
        .filter((p) => (p.lng as number) >= w && (p.lng as number) <= e)
        .filter((p) => (p.lat as number) >= s && (p.lat as number) <= n)
        .filter((p) => !type || type === 'all' || p.type === type)
        .filter((p) => !term || p.title.toLowerCase().includes(term))
        .slice(0, 500)
        .map((p) => ({ id: p.id, type: p.type, lat: p.lat, lng: p.lng, title: p.title, startAt: p.startAt }));
      return { city: ref(city), citySource: source, pins };
    },
  ],
  [
    // Posts in the feed's city: title matches first, then shared interests, then soonest.
    'GET',
    /^\/api\/v1\/search\/posts$/,
    (_m, req, q) => {
      const term = (q.get('q') ?? '').trim();
      const interestIds = idList(q, 'interestIds');
      if (!term && interestIds.length === 0)
        return invalid([{ field: 'q', message: 'Search for words, interests or both.' }]);
      if (term && (term.length < 2 || term.length > 100))
        return invalid([{ field: 'q', message: 'Search with 2 to 100 characters.' }]);
      if (interestIds.length > 10)
        return invalid([{ field: 'interestIds', message: 'Pick up to 10 interests.' }]);
      const type = q.get('type');
      const { city, source } = feedCity(req.headers);
      const lower = term.toLowerCase();
      const scored = live()
        .filter((p) => p.cityId === city.id && (!type || type === 'all' || p.type === type))
        .map((p) => ({
          p,
          title: !!lower && p.title.toLowerCase().includes(lower),
          shared: p.interestIds.filter((id) => interestIds.includes(id)).length,
        }))
        .filter((x) => x.title || x.shared > 0)
        .sort(
          (a, b) => Number(b.title) - Number(a.title) || b.shared - a.shared || soonestFirst(a.p, b.p),
        )
        .slice(0, 100)
        .map((x) => card(x.p, req.headers));
      return { ...page(scored, q, 50), city: ref(city), citySource: source };
    },
  ],
  [
    // People by first name or handle; a leading @ is fine.
    'GET',
    /^\/api\/v1\/search\/people$/,
    (_m, _r, q) => {
      const term = (q.get('q') ?? '').trim().replace(/^@/, '').toLowerCase();
      if (term.length < 2 || term.length > 100)
        return invalid([{ field: 'q', message: 'Search with 2 to 100 characters.' }]);
      const people = searchablePeople().filter(
        (p) =>
          (p.displayName.split(' ')[0] ?? '').toLowerCase().startsWith(term) ||
          (p.handle ?? '').toLowerCase().includes(term),
      );
      return page(people.slice(0, 100), q, 50);
    },
  ],

  // ----- posts -----
  [
    'POST',
    /^\/api\/v1\/posts$/,
    (_m, req) => {
      const { input, files } = createInput(req.body);
      const type = (input.type as DemoPost['type']) ?? 'meetup';
      const typeErrors = typeFieldErrors(type, input);
      if (typeErrors.length) return invalid(typeErrors);
      const p: DemoPost = {
        id: `demo-post-${nextId++}`,
        type,
        status: 'draft',
        title: String(input.title ?? ''),
        description: '',
        startAt: null,
        endAt: null,
        placeName: null,
        lat: null,
        lng: null,
        cityId: me?.homeCityId ?? 'lagos',
        capacity: null,
        goingCount: 0,
        priceCents: null,
        currency: null,
        externalUrl: null,
        visibility: 'open',
        showOnMap: true,
        waitlistEnabled: false,
        images: localImages(files),
        hostIndex: 'me',
        interestIds: [],
        schedule: [],
        itinerary: [],
        cost: null,
        recurrence: null,
        rsvpState: 'none',
        reported: false,
      };
      // `type` and `status` are not post fields to apply: one is fixed above, the other decides below.
      const { status, ...fields } = input;
      delete fields.type;
      const errors = applyFields(p, fields);
      if (errors.length) return invalid(errors);
      if (status === 'published') {
        const failing = publishErrors(p);
        if (failing.length) return invalid(failing, 'Publish rules failed.');
        p.status = 'published';
      }
      posts.push(p);
      return detail(p, req.headers);
    },
  ],
  [
    'GET',
    /^\/api\/v1\/posts\/([^/]+)$/,
    (m, req) => {
      const p = findPost(m[1] ?? '');
      return p ? detail(p, req.headers) : fail(404, 'NOT_FOUND', 'This post is not available.');
    },
  ],
  [
    'PATCH',
    /^\/api\/v1\/posts\/([^/]+)$/,
    (m, req) => {
      const p =
        posts.find((x) => x.id === m[1] && x.hostIndex === 'me') ?? fail(404, 'NOT_FOUND', 'Not your post.');
      if (p.status === 'cancelled') return fail(409, 'CONFLICT', 'This post was cancelled.');
      const b = { ...((req.body as Record<string, unknown> | null) ?? {}) };
      const fixed = (['type', 'status'] as const)
        .filter((k) => b[k] !== undefined)
        .map((field) => ({ field, message: `${field} can’t be changed here.` }));
      const errors = [...fixed, ...typeFieldErrors(p.type, b)];
      if (errors.length) return invalid(errors);
      // Worked on a copy, so a refused edit leaves the post as it was.
      const next: DemoPost = { ...p };
      const fieldErrors = applyFields(next, b);
      if (fieldErrors.length) return invalid(fieldErrors);
      // A live post is held to the publish rules after every edit.
      if (next.status === 'published') {
        const failing = publishErrors(next);
        if (failing.length) return invalid(failing, 'Publish rules failed.');
      }
      Object.assign(p, next);
      return detail(p, req.headers);
    },
  ],
  [
    'PUT',
    /^\/api\/v1\/posts\/([^/]+)\/images$/,
    (m, req) => {
      const p =
        posts.find((x) => x.id === m[1] && x.hostIndex === 'me') ?? fail(404, 'NOT_FOUND', 'Not your post.');
      p.images = localImages(formFields(req.body).files);
      return detail(p, req.headers);
    },
  ],
  [
    'POST',
    /^\/api\/v1\/posts\/([^/]+)\/publish$/,
    (m, req) => {
      const p =
        posts.find((x) => x.id === m[1] && x.hostIndex === 'me') ?? fail(404, 'NOT_FOUND', 'Not your post.');
      if (p.status !== 'draft') return fail(409, 'CONFLICT', 'Already live.');
      const errors = publishErrors(p);
      if (errors.length) return invalid(errors, 'Publish rules failed.');
      p.status = 'published';
      return detail(p, req.headers);
    },
  ],
  [
    'POST',
    /^\/api\/v1\/posts\/([^/]+)\/rsvp$/,
    (m) => {
      const p = posts.find((x) => x.id === m[1]) ?? fail(404, 'NOT_FOUND', 'This post is not available.');
      if (p.hostIndex === 'me') return fail(409, 'CONFLICT', 'You host this one.');
      if (p.status === 'cancelled') return fail(409, 'POST_CANCELLED', 'This post was cancelled.');
      if (p.rsvpState === 'none') {
        const full = p.capacity !== null && p.goingCount >= p.capacity;
        if (p.visibility === 'private') p.rsvpState = 'requested';
        else if (full && p.waitlistEnabled) p.rsvpState = 'waitlisted';
        else if (full) return fail(409, 'POST_FULL', 'This one is full.');
        else {
          p.rsvpState = 'going';
          p.goingCount += 1;
        }
      }
      return {
        state: p.rsvpState,
        goingCount: p.goingCount,
        capacity: p.capacity,
        waitlistPosition: p.rsvpState === 'waitlisted' ? 1 : null,
      };
    },
  ],
  [
    'DELETE',
    /^\/api\/v1\/posts\/([^/]+)\/rsvp$/,
    (m) => {
      const p = posts.find((x) => x.id === m[1]);
      if (p) {
        if (p.rsvpState === 'going') p.goingCount -= 1;
        p.rsvpState = 'none';
      }
      return undefined;
    },
  ],
  ['POST', /^\/api\/v1\/posts\/([^/]+)\/link-click$/, () => undefined],
  [
    // Saving twice keeps the first save's place in the list.
    'POST',
    /^\/api\/v1\/posts\/([^/]+)\/save$/,
    (m) => {
      const p = findPost(m[1] ?? '') ?? fail(404, 'NOT_FOUND', 'This post is not available.');
      if (p.status === 'draft' || p.status === 'cancelled')
        return fail(409, 'CONFLICT', 'Only a live post can be saved.');
      if (!saves.has(p.id)) saves.set(p.id, true);
      return undefined;
    },
  ],
  [
    'DELETE',
    /^\/api\/v1\/posts\/([^/]+)\/save$/,
    (m) => {
      saves.delete(m[1] ?? '');
      return undefined;
    },
  ],
  [
    'POST',
    /^\/api\/v1\/posts\/([^/]+)\/report$/,
    (m) => {
      const p = posts.find((x) => x.id === m[1]) ?? fail(404, 'NOT_FOUND', 'This post is not available.');
      if (p.hostIndex === 'me') return fail(400, 'BAD_REQUEST', 'You cannot report your own post.');
      if (p.reported) return fail(409, 'CONFLICT', 'You already reported this.');
      p.reported = true;
      return { id: `report-${p.id}` };
    },
  ],

  // ----- Travel: subscription and teleport -----
  ['GET', /^\/api\/v1\/me\/subscription$/, () => (signedIn(), subscriptionDto())],
  [
    'GET',
    /^\/api\/v1\/me\/subscription\/challenge$/,
    () => ({ challenge: `demo-challenge-${Date.now().toString(36)}` }),
  ],
  [
    // A store purchase or restore: the demo trusts it and turns Travel on.
    'POST',
    /^\/api\/v1\/me\/subscription\/(apple|google)$/,
    (m) => {
      signedIn();
      const store = m[1] as 'apple' | 'google';
      subscription = {
        subscribed: true,
        platform: store,
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * DAY).toISOString(),
        autoRenew: true,
        manage: store,
      };
      return subscriptionDto();
    },
  ],
  [
    'POST',
    /^\/api\/v1\/me\/subscription\/checkout$/,
    () => {
      signedIn();
      if (subscription.subscribed) return fail(409, 'CONFLICT', 'Travel is already on.');
      return { url: 'https://checkout.ajalatrvl.com/demo' };
    },
  ],
  [
    // Back from the web checkout: safe to repeat.
    'POST',
    /^\/api\/v1\/me\/subscription\/checkout\/confirm$/,
    () => {
      signedIn();
      if (subscription.platform !== 'stripe' || !subscription.subscribed) {
        subscription = {
          subscribed: true,
          platform: 'stripe',
          status: 'active',
          currentPeriodEnd: new Date(Date.now() + 30 * DAY).toISOString(),
          autoRenew: true,
          manage: 'web',
        };
      }
      return subscriptionDto();
    },
  ],
  [
    'POST',
    /^\/api\/v1\/me\/subscription\/portal$/,
    () => {
      signedIn();
      return subscription.manage === 'web'
        ? { url: 'https://billing.ajalatrvl.com/demo' }
        : fail(404, 'NOT_FOUND', 'No web subscription to manage.');
    },
  ],
  [
    'POST',
    /^\/api\/v1\/me\/teleport$/,
    (_m, req) => {
      signedIn();
      if (!subscription.subscribed) return fail(402, 'PAYMENT_REQUIRED', 'Teleport is part of Travel.');
      const cityId = String((req.body as { cityId?: unknown } | null)?.cityId ?? '');
      if (!cityById(cityId)) return fail(404, 'NOT_FOUND', 'No such city.');
      teleportCityId = cityId;
      return undefined;
    },
  ],
  [
    'DELETE',
    /^\/api\/v1\/me\/teleport$/,
    () => {
      teleportCityId = null;
      return undefined;
    },
  ],
];

// ---------- for the area routes in routes/ ----------

/** The live demo world: read and change it from an area's routes. */
export const store = {
  get posts() {
    return posts;
  },
  get me() {
    return me;
  },
  set me(value: DemoMe | null) {
    me = value;
  },
  nextId: () => nextId++,
  /** Whether the demo person saved a post (`saved` on its card). */
  isSaved: (postId: string) => saves.has(postId),
  /** Ends Travel, as a lapsed subscription would (tests reach the paywall's 402 with it). */
  endSubscription: () => {
    subscription = { ...subscription, subscribed: false, status: 'expired', autoRenew: false };
  },
};

export {
  DAY,
  at,
  card,
  cityById,
  cityDto,
  clientPoint,
  detail,
  distanceKm,
  fail,
  feedCity,
  findPost,
  host,
  invalid,
  iso,
  live,
  meDto,
  nearestCity,
  page,
  ref,
  soonestFirst,
};
