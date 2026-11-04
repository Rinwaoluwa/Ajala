import { ApiError } from '../../api/ApiError';
import {
  at,
  card,
  cityById,
  fail,
  iso,
  page,
  ref,
  registerArchive,
  store,
  traveller,
  type DemoPerson,
  type DemoPost,
  type DemoRoute,
} from '../demoStore';
import { DEMO_HOSTS, DEMO_INTERESTS, images } from '../demoData';

/**
 * Demo answers for other travellers' profiles (API map §9, spec §2.14): who they
 * are (`GET /users/:id`), what they host and went to, blocking (also
 * `GET /me/blocks`, which Settings lists) and reporting a person.
 *
 * Their past activities live here, not in the shared store, so they never show
 * on the feed or the map.
 */

type Person = {
  bio: string;
  interests: string[];
  handle: string;
  city: string;
  memberDays: number;
  tagline?: string;
};

const PEOPLE: Record<string, Person> = {
  'h-tolu': {
    handle: 'tolu.travels',
    bio: 'Lagos born, always exploring. Food, culture and long walks.',
    interests: ['food', 'art', 'music'],
    city: 'lagos',
    memberDays: 240,
    tagline: 'Host of the best suya tours',
  },
  'h-kemi': {
    handle: 'kemi.o',
    bio: 'Yoga teacher and coffee snob. Say hi at the next sunset class.',
    interests: ['wellness', 'coffee'],
    city: 'lagos',
    memberDays: 180,
  },
  'h-james': {
    handle: 'jamesk',
    bio: 'Nairobi to Lagos for work. Weekend markets and beaches.',
    interests: ['markets', 'beach', 'photography'],
    city: 'nairobi',
    memberDays: 60,
  },
  'h-amara': {
    handle: 'amara.n',
    bio: 'Music lover. I put on the nights you’ll talk about on Monday.',
    interests: ['music', 'nightlife'],
    city: 'lagos',
    memberDays: 400,
  },
  'h-lena': {
    handle: 'lena.v',
    bio: 'Photographer from Amsterdam, chasing golden hour across West Africa.',
    interests: ['photography', 'hiking', 'art'],
    city: 'amsterdam',
    memberDays: 90,
  },
  'h-seun': {
    handle: 'seun.b',
    bio: 'Founder, cyclist, early riser.',
    interests: ['tech', 'cycling'],
    city: 'lagos',
    memberDays: 300,
  },
};

const blocked = new Set<string>();
const reported = new Set<string>();

/** A finished past activity for someone's history. */
function past(
  id: string,
  type: DemoPost['type'],
  title: string,
  daysAgo: number,
  cityId: string,
  placeName: string,
  interestIds: string[],
): DemoPost {
  const city = cityById(cityId);
  return {
    id,
    type,
    status: 'published',
    title,
    description: '',
    startAt: iso(at(-daysAgo, 17, 0)),
    placeName,
    lat: city?.lat ?? null,
    lng: city?.lng ?? null,
    cityId,
    capacity: 12,
    goingCount: 6 + (daysAgo % 7),
    priceCents: null,
    currency: null,
    externalUrl: null,
    visibility: 'open',
    showOnMap: false,
    waitlistEnabled: false,
    images: images(id, 2),
    hostIndex: 0,
    interestIds,
    checklist: [],
    rsvpState: 'going',
    reported: false,
  };
}

/** Built on first use, so the relative dates are fresh when the demo starts. */
let historyCache: Record<string, DemoPost[]> | null = null;
const history = (): Record<string, DemoPost[]> =>
  (historyCache ??= {
    'h-tolu': [
      past('ht-1', 'plan', 'Lekki Conservation Trail', 40, 'lagos', 'Lekki Conservation Centre', ['hiking']),
      past('ht-2', 'meetup', 'Lagos food tour', 30, 'lagos', 'Victoria Island', ['food']),
      past('ht-3', 'event', 'Art & culture walk', 25, 'lagos', 'National Museum', ['art']),
      past('ht-4', 'plan', 'Weekend in Accra', 60, 'accra', 'Osu, Accra', ['food', 'music']),
      past('ht-5', 'meetup', 'Coffee + coworking', 12, 'lagos', 'Yaba', ['coffee']),
      past('ht-6', 'plan', 'Mountain Adventure', 90, 'nairobi', 'Ngong Hills', ['hiking']),
    ],
    'h-lena': [
      past('hl-1', 'meetup', 'Canal photo walk', 50, 'amsterdam', 'Jordaan', ['photography']),
      past('hl-2', 'plan', 'Sunset hike', 20, 'lagos', 'Lekki Conservation Centre', [
        'hiking',
        'photography',
      ]),
    ],
    'h-amara': [
      past('ha-1', 'event', 'Afrobeats Live', 14, 'lagos', 'The House, VI', ['music', 'nightlife']),
      past('ha-2', 'event', 'Jazz Night', 35, 'lagos', 'Terra Kulture', ['music']),
      past('ha-3', 'event', 'Highlife Classics', 70, 'accra', 'Labadi', ['music']),
    ],
  });

const hostIndex = (id: string) => DEMO_HOSTS.findIndex((h) => h.id === id);

function profileDto(id: string) {
  if (id === 'me' || id === store.me?.id) {
    const me = store.me;
    if (!me) return fail(404, 'NOT_FOUND', 'Not available.');
    const home = cityById(me.homeCityId);
    return {
      id: me.id,
      handle: me.handle,
      displayName: `${me.firstName ?? ''} ${me.lastName?.[0] ?? ''}.`.trim(),
      avatarUrl: me.avatarUrl,
      gender: me.gender,
      bio: null,
      photos: [],
      homeCity: home ? ref(home) : null,
      visiting: null,
      verified: false,
      interests: DEMO_INTERESTS.filter((i) => me.interestIds.includes(i.id)),
      extras: me.extras,
      memberSince: new Date(Date.now() - 30 * 86_400_000).toISOString(),
      blockedByMe: false,
    };
  }
  const host = DEMO_HOSTS[hostIndex(id)];
  const person = PEOPLE[id];
  if (!host || !person) {
    // An attendee, commenter or chat partner: a short profile from what is known.
    const someone = traveller(id);
    if (someone) return travellerDto(someone);
    return fail(404, 'NOT_FOUND', 'This profile isn’t available.');
  }
  const home = cityById(person.city);
  return {
    id: host.id,
    handle: person.handle,
    displayName: host.displayName,
    avatarUrl: host.avatarUrl,
    gender: 'prefer_not_to_say',
    bio: person.bio,
    photos: [],
    homeCity: home ? ref(home) : null,
    visiting: null,
    verified: host.verified,
    interests: DEMO_INTERESTS.filter((i) => person.interests.includes(i.id)),
    extras: { tagline: person.tagline ?? null, languages: ['en'] },
    memberSince: new Date(Date.now() - person.memberDays * 86_400_000).toISOString(),
    blockedByMe: blocked.has(id),
  };
}

const TRAVELLER_INTERESTS = [['food', 'music'], ['hiking', 'photography'], ['art', 'coffee'], ['nightlife']];

/** A profile for someone the demo only knows by name and photo. */
function travellerDto(p: DemoPerson) {
  const seed = [...p.id].reduce((sum, c) => sum + c.charCodeAt(0), 0);
  const first = p.displayName.split(' ')[0] ?? p.displayName;
  const lagos = cityById('lagos');
  const interests = TRAVELLER_INTERESTS[seed % TRAVELLER_INTERESTS.length] ?? [];
  return {
    id: p.id,
    handle: p.displayName.toLowerCase().replace(/[^a-z]+/g, '.'),
    displayName: p.displayName,
    avatarUrl: p.avatarUrl,
    gender: 'prefer_not_to_say',
    bio: `${first} loves meeting new people around Lagos.`,
    photos: [],
    homeCity: lagos ? ref(lagos) : null,
    visiting: null,
    verified: p.verified ?? false,
    interests: DEMO_INTERESTS.filter((i) => interests.includes(i.id)),
    extras: { tagline: null, languages: ['en'] },
    memberSince: new Date(Date.now() - (30 + (seed % 300)) * 86_400_000).toISOString(),
    blockedByMe: blocked.has(p.id),
  };
}

// Other travellers' past activities open on the post page like any other post.
registerArchive((id) =>
  Object.values(history())
    .flat()
    .find((p) => p.id === id),
);

export const profileRoutes: DemoRoute[] = [
  ['GET', /^\/api\/v1\/users\/([^/]+)$/, (m) => profileDto(m[1] as string)],
  [
    'GET',
    /^\/api\/v1\/users\/([^/]+)\/posts$/,
    (m, req, q) => {
      const id = m[1] as string;
      profileDto(id);
      const index = id === 'me' ? 'me' : hostIndex(id);
      const now = Date.now();
      const items = store.posts
        .filter((p) => p.status === 'published' && p.hostIndex === index)
        .filter((p) => !p.startAt || new Date(p.startAt).getTime() > now)
        .sort((a, b) => (b.startAt ?? '').localeCompare(a.startAt ?? ''))
        .map((p) => card(p, req.headers));
      return page(items, q);
    },
  ],
  [
    'GET',
    /^\/api\/v1\/users\/([^/]+)\/attended$/,
    (m, req, q) => {
      const id = m[1] as string;
      profileDto(id);
      const items = [...(history()[id] ?? [])]
        .sort((a, b) => (b.startAt ?? '').localeCompare(a.startAt ?? ''))
        .map((p) => card(p, req.headers));
      return page(items, q);
    },
  ],
  [
    'POST',
    /^\/api\/v1\/users\/([^/]+)\/block$/,
    (m) => {
      const id = m[1] as string;
      if (id === 'me' || id === store.me?.id) return fail(400, 'BAD_REQUEST', 'You can’t block yourself.');
      profileDto(id);
      blocked.add(id);
      return undefined;
    },
  ],
  [
    'DELETE',
    /^\/api\/v1\/users\/([^/]+)\/block$/,
    (m) => {
      blocked.delete(m[1] as string);
      return undefined;
    },
  ],
  [
    'GET',
    /^\/api\/v1\/me\/blocks$/,
    (_m, _r, q) =>
      page(
        [...blocked].map((id) => profileDto(id)),
        q,
      ),
  ],
  [
    'POST',
    /^\/api\/v1\/users\/([^/]+)\/report$/,
    (m, req) => {
      const id = m[1] as string;
      if (id === 'me' || id === store.me?.id) return fail(400, 'BAD_REQUEST', 'You can’t report yourself.');
      profileDto(id);
      const body = req.body as { reason?: string; details?: string };
      if (body?.reason === 'other' && !body.details?.trim()) {
        throw new ApiError({
          code: 'VALIDATION_FAILED',
          message: 'Details are required.',
          status: 400,
          fieldErrors: [{ field: 'details', message: 'Tell us what happened.' }],
          requestId: 'demo',
        });
      }
      if (reported.has(id)) return fail(409, 'CONFLICT', 'You already reported this profile.');
      reported.add(id);
      return { id: `report-${id}` };
    },
  ],
];
