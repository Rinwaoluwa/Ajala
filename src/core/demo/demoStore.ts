import { ApiError, type ApiErrorCode } from '../api/ApiError';
import { DEMO_CITIES, DEMO_HOSTS, DEMO_INTERESTS, DEMO_POST_SEEDS, images, type DemoCity } from './demoData';

/**
 * The demo world and the routes every area shares — see `demoApi.ts` for how a
 * request is answered. A pretend Ajala API for demos and UI testing, switched on with
 * `EXPO_PUBLIC_DEMO=1` (see docs/DEMO.md). `apiClient` hands every request
 * here instead of the network, so every feature runs its real repositories,
 * mappers and caches against answers shaped exactly like the API's (spec §6).
 *
 * It keeps its state in memory for as long as the app runs: a post you publish
 * appears on the feed and the map, an RSVP sticks, a second report is refused.
 * Restarting the app starts the world again.
 *
 * Any email and password sign in to a finished profile in Lagos. Signing up
 * works too: any 6-digit code verifies it, and profile setup follows.
 */

export type DemoRequest = {
  method: string;
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
};

const DAY = 24 * 60 * 60 * 1000;

// ---------- state ----------

export type DemoPost = {
  id: string;
  type: 'meetup' | 'event' | 'plan' | 'group';
  status: 'draft' | 'published';
  title: string;
  description: string;
  startAt: string | null;
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
  checklist: string[];
  rsvpState: 'none' | 'requested' | 'going' | 'waitlisted';
  reported: boolean;
};

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

function seedPosts(): DemoPost[] {
  return DEMO_POST_SEEDS.map((s) => ({
    id: s.id,
    type: s.type,
    status: 'published',
    title: s.title,
    description: s.description,
    startAt: iso(seedStart(s.when)),
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
    checklist: [],
    rsvpState: 'none',
    reported: false,
  }));
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
  extras: { languages: ['en'] },
  profileCompletedAt: new Date(Date.now() - 30 * DAY).toISOString(),
});

let posts = seedPosts();
let me: DemoMe | null = null;
let nextId = 1;

/** Starts the demo world again (tests, and a sign-out followed by sign-in). */
export function resetDemo() {
  posts = seedPosts();
  me = null;
  nextId = 1;
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

const cityById = (id: string | null) => DEMO_CITIES.find((c) => c.id === id) ?? null;
const ref = (c: DemoCity) => ({ id: c.id, name: c.name, countryCode: c.countryCode, label: c.label });
const cityDto = (c: DemoCity) => ({
  ...ref(c),
  region: c.region,
  countryName: c.countryName,
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

/** The feed's city: where the phone is, then the home city, then Lagos. */
function feedCity(headers?: Record<string, string>) {
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

function card(p: DemoPost, headers?: Record<string, string>) {
  const point = clientPoint(headers);
  const c = cityById(p.cityId) ?? (cityById('lagos') as DemoCity);
  return {
    id: p.id,
    type: p.type,
    title: p.title,
    images: p.images,
    startAt: p.startAt,
    placeName: p.placeName,
    lat: p.lat,
    lng: p.lng,
    city: ref(c),
    capacity: p.capacity,
    price:
      p.priceCents === null
        ? null
        : { amountCents: p.priceCents, currency: p.currency ?? 'NGN', exponent: 2, tier: null },
    externalUrl: p.externalUrl,
    joinMode: p.type === 'event' && p.priceCents !== null && p.externalUrl ? 'external' : 'rsvp',
    goingCount: p.goingCount,
    rsvpState: p.rsvpState,
    visibility: p.visibility,
    host: host(p),
    interests: DEMO_INTERESTS.filter((i) => p.interestIds.includes(i.id)),
    distanceKm:
      point && p.lat !== null && p.lng !== null ? distanceKm(point, { lat: p.lat, lng: p.lng }) : null,
  };
}

function detail(p: DemoPost, headers?: Record<string, string>) {
  return {
    ...card(p, headers),
    description: p.description,
    showOnMap: p.showOnMap,
    waitlistEnabled: p.waitlistEnabled,
    status: p.status,
    checklist: p.checklist.map((text, i) => ({
      id: `${p.id}-c${i}`,
      text,
      position: i,
      checked: false,
      checkedById: null,
    })),
    isHost: p.hostIndex === 'me',
    canTickChecklist: p.hostIndex === 'me' || p.rsvpState === 'going',
    waitlistPosition: p.rsvpState === 'waitlisted' ? 1 : null,
    linkClickCount: p.hostIndex === 'me' ? 0 : null,
  };
}

function page<T>(items: T[], query: URLSearchParams) {
  const limit = Number(query.get('limit') ?? 20);
  const start = Number(query.get('cursor') ?? 0);
  const slice = items.slice(start, start + limit);
  return { items: slice, nextCursor: start + limit < items.length ? String(start + limit) : null };
}

const live = () => posts.filter((p) => p.status === 'published');
const soonestFirst = (a: DemoPost, b: DemoPost) => (a.startAt ?? '').localeCompare(b.startAt ?? '');

function meDto() {
  if (!me) return fail(401, 'UNAUTHORIZED', 'Not signed in (demo).');
  const home = cityById(me.homeCityId);
  return {
    id: me.id,
    status: 'active',
    firstName: me.firstName,
    lastName: me.lastName,
    handle: me.handle,
    dob: me.dob,
    gender: me.gender,
    email: me.email,
    bio: me.bio,
    timezone: 'Africa/Lagos',
    avatarUrl: me.avatarUrl,
    photos: [],
    homeCity: home ? ref(home) : null,
    visiting: null,
    verified: false,
    interests: DEMO_INTERESTS.filter((i) => me?.interestIds.includes(i.id)),
    extras: me.extras,
    profileCompletedAt: me.profileCompletedAt,
    identities: [{ provider: 'email', verifiedAt: new Date().toISOString() }],
    termsVersion: '2026-01',
    termsUpToDate: true,
    createdAt: new Date(Date.now() - 30 * DAY).toISOString(),
  };
}

function session(user: DemoMe, isNew: boolean) {
  return {
    accessToken: `demo-access-${Date.now()}`,
    refreshToken: `demo-refresh-${Date.now()}`,
    accessExpiresAt: new Date(Date.now() + 365 * DAY).toISOString(),
    sessionId: 'demo-session',
    isNew,
    user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
  };
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

/** The publish rules (spec §2.12), so the review step's server errors can be seen too. */
function publishErrors(p: DemoPost) {
  const errors: { field: string; message: string }[] = [];
  if (!p.startAt || new Date(p.startAt).getTime() <= Date.now())
    errors.push({ field: 'startAt', message: 'Pick a start time in the future.' });
  if (!p.description) errors.push({ field: 'description', message: 'Add a description.' });
  if (p.images.length < 2 || p.images.length > 4)
    errors.push({ field: 'images', message: 'Add 2 to 4 photos.' });
  if (p.interestIds.length < 1 || p.interestIds.length > 3)
    errors.push({ field: 'interestIds', message: 'Pick 1 to 3 interests.' });
  if ((p.type === 'meetup' || p.type === 'event') && (p.lat === null || p.lng === null))
    errors.push({ field: 'lat', message: 'Add a meeting point on the map.' });
  if (p.type === 'event' && p.priceCents !== null && !p.externalUrl)
    errors.push({ field: 'externalUrl', message: 'A paid event needs a link to pay or book.' });
  return errors;
}

function applyFields(p: DemoPost, f: Record<string, unknown>) {
  const str = (k: string) => (f[k] === undefined ? undefined : f[k] === null ? null : String(f[k]));
  const num = (k: string) =>
    f[k] === undefined || f[k] === null ? (f[k] as null | undefined) : Number(f[k]);
  const bool = (k: string) => (f[k] === undefined ? undefined : String(f[k]) === 'true');
  if (str('title') !== undefined) p.title = str('title') ?? p.title;
  if (str('description') !== undefined) p.description = str('description') ?? '';
  if (str('startAt') !== undefined) p.startAt = str('startAt') ?? null;
  if (str('placeName') !== undefined) p.placeName = str('placeName') ?? null;
  if (num('lat') !== undefined) p.lat = num('lat') ?? null;
  if (num('lng') !== undefined) p.lng = num('lng') ?? null;
  if (num('capacity') !== undefined) p.capacity = num('capacity') ?? null;
  if (num('priceCents') !== undefined) p.priceCents = num('priceCents') ?? null;
  if (str('currency') !== undefined) p.currency = str('currency') ?? null;
  if (str('externalUrl') !== undefined) p.externalUrl = str('externalUrl') ?? null;
  if (str('visibility') !== undefined) p.visibility = str('visibility') === 'private' ? 'private' : 'open';
  if (bool('showOnMap') !== undefined) p.showOnMap = bool('showOnMap') ?? true;
  if (bool('waitlistEnabled') !== undefined) p.waitlistEnabled = bool('waitlistEnabled') ?? false;
  if (p.lat !== null && p.lng !== null) p.cityId = nearestCity({ lat: p.lat, lng: p.lng }).id;
}

// ---------- the routes ----------

export type Handler = (match: RegExpMatchArray, req: DemoRequest, query: URLSearchParams) => unknown;
/** A method, a path pattern and its answer. Each area adds its own in `routes/` (see `routes/index.ts`). */
export type DemoRoute = [string, RegExp, Handler];

/** The routes every area shares: auth, me, cities, feed, map, posts. */
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
    'POST',
    /^\/api\/v1\/auth\/login$/,
    (_m, req) => {
      const email = String((req.body as { email?: string })?.email ?? 'demo@ajala.app');
      me = finishedProfile(email);
      return session(me, false);
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
        profileCompletedAt: null,
      };
      return undefined;
    },
  ],
  [
    'POST',
    /^\/api\/v1\/auth\/otp\/verify$/,
    (_m, req) => {
      const code = String((req.body as { code?: string })?.code ?? '');
      if (!/^\d{6}$/.test(code)) return fail(400, 'VALIDATION_FAILED', 'Enter the 6-digit code.');
      me ??= finishedProfile(String((req.body as { target?: string }).target));
      return session(me, me.profileCompletedAt === null);
    },
  ],
  ['POST', /^\/api\/v1\/auth\/otp\/resend$/, () => undefined],
  ['POST', /^\/api\/v1\/auth\/refresh$/, () => session(me ?? finishedProfile('demo@ajala.app'), false)],
  [
    'POST',
    /^\/api\/v1\/auth\/logout$/,
    () => {
      me = null;
      return undefined;
    },
  ],
  ['POST', /^\/api\/v1\/auth\/password\/(forgot|reset)$/, () => undefined],
  [
    'POST',
    /^\/api\/v1\/auth\/oauth\//,
    () => fail(503, 'SERVICE_UNAVAILABLE', 'Google and Apple sign-in are not in the demo. Use email.'),
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
      if (!me) return fail(401, 'UNAUTHORIZED', 'Not signed in (demo).');
      const b = req.body as Partial<DemoMe> & { homeCityId?: string | null; interestIds?: string[] };
      me = {
        ...me,
        ...b,
        interestIds: b.interestIds ?? me.interestIds,
        homeCityId: b.homeCityId !== undefined ? b.homeCityId : me.homeCityId,
      };
      if (me.firstName && me.lastName && me.dob && me.gender && !me.profileCompletedAt) {
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
    'GET',
    /^\/api\/v1\/cities$/,
    (_m, _r, q) => {
      const term = (q.get('q') ?? '').trim().toLowerCase();
      const limit = Number(q.get('limit') ?? 10);
      return DEMO_CITIES.filter((c) => `${c.name} ${c.countryName}`.toLowerCase().includes(term))
        .sort(
          (a, b) =>
            Number(!a.name.toLowerCase().startsWith(term)) - Number(!b.name.toLowerCase().startsWith(term)),
        )
        .slice(0, limit)
        .map(cityDto);
    },
  ],
  ['GET', /^\/api\/v1\/interests$/, () => DEMO_INTERESTS],

  // ----- feed, map, explore -----
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
      const [west, south, east, north] = (q.get('bbox') ?? '').split(',').map(Number);
      if ([west, south, east, north].some((n) => !Number.isFinite(n)))
        return fail(400, 'BAD_REQUEST', 'bbox is west,south,east,north.');
      const type = q.get('type');
      const { city, source } = feedCity(req.headers);
      const pins = live()
        .filter((p) => p.showOnMap && p.lat !== null && p.lng !== null && p.startAt)
        .filter((p) => (p.lng as number) >= (west as number) && (p.lng as number) <= (east as number))
        .filter((p) => (p.lat as number) >= (south as number) && (p.lat as number) <= (north as number))
        .filter((p) => !type || p.type === type)
        .map((p) => ({ id: p.id, type: p.type, lat: p.lat, lng: p.lng, title: p.title, startAt: p.startAt }));
      return { city: ref(city), citySource: source, pins };
    },
  ],
  [
    'GET',
    /^\/api\/v1\/explore\/meetups$/,
    (_m, req, q) => {
      const { city, source } = feedCity(req.headers);
      const interest = q.get('interestId');
      const items = live()
        .filter(
          (p) =>
            p.type === 'meetup' && p.cityId === city.id && (!interest || p.interestIds.includes(interest)),
        )
        .sort(soonestFirst)
        .map((p) => card(p, req.headers));
      return { ...page(items, q), city: ref(city), citySource: source };
    },
  ],

  // ----- posts -----
  [
    'POST',
    /^\/api\/v1\/posts$/,
    (_m, req) => {
      const { fields, lists, files } = formFields(req.body);
      const p: DemoPost = {
        id: `demo-post-${nextId++}`,
        type: (fields.type as DemoPost['type']) ?? 'meetup',
        status: 'draft',
        title: fields.title ?? '',
        description: '',
        startAt: null,
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
        interestIds: lists.interestIds ?? [],
        checklist: lists.checklist ?? [],
        rsvpState: 'none',
        reported: false,
      };
      applyFields(p, fields);
      if (fields.status === 'published') {
        const errors = publishErrors(p);
        if (errors.length) {
          throw new ApiError({
            code: 'VALIDATION_FAILED',
            message: 'Publish rules failed.',
            status: 400,
            fieldErrors: errors,
            requestId: 'demo',
          });
        }
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
      const p = posts.find((x) => x.id === m[1]) ?? archived(m[1] ?? '');
      return p ? detail(p, req.headers) : fail(404, 'NOT_FOUND', 'This post is not available.');
    },
  ],
  [
    'PATCH',
    /^\/api\/v1\/posts\/([^/]+)$/,
    (m, req) => {
      const p =
        posts.find((x) => x.id === m[1] && x.hostIndex === 'me') ?? fail(404, 'NOT_FOUND', 'Not your post.');
      const b = req.body as Record<string, unknown>;
      applyFields(p, b);
      if (Array.isArray(b.interestIds)) p.interestIds = b.interestIds as string[];
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
    'PUT',
    /^\/api\/v1\/posts\/([^/]+)\/checklist$/,
    (m, req) => {
      const p =
        posts.find((x) => x.id === m[1] && x.hostIndex === 'me') ?? fail(404, 'NOT_FOUND', 'Not your post.');
      p.checklist = ((req.body as { items?: { text: string }[] }).items ?? []).map((i) => i.text);
      return detail(p, req.headers).checklist;
    },
  ],
  [
    'POST',
    /^\/api\/v1\/posts\/([^/]+)\/publish$/,
    (m, req) => {
      const p =
        posts.find((x) => x.id === m[1] && x.hostIndex === 'me') ?? fail(404, 'NOT_FOUND', 'Not your post.');
      if (p.status === 'published') return fail(409, 'CONFLICT', 'Already live.');
      const errors = publishErrors(p);
      if (errors.length) {
        throw new ApiError({
          code: 'VALIDATION_FAILED',
          message: 'Publish rules failed.',
          status: 400,
          fieldErrors: errors,
          requestId: 'demo',
        });
      }
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
  host,
  iso,
  live,
  meDto,
  nearestCity,
  page,
  ref,
  soonestFirst,
};
