import { at, card, iso, page, registerArchive, store, type DemoPost, type DemoRoute } from '../demoStore';
import { images } from '../demoData';

/**
 * Demo answers for the Trips tab: my own posts (`GET /me/posts`, both statuses —
 * the Drafts screen reads the draft branch) and the past posts I went to
 * (`GET /me/attended`).
 *
 * The attended posts live here, not in the shared store, so they never appear
 * on the feed or the map — they are over.
 */

type AttendedSeed = {
  id: string;
  type: DemoPost['type'];
  title: string;
  daysAgo: number;
  hour: number;
  placeName: string;
  cityId: string;
  lat: number;
  lng: number;
  goingCount: number;
  host: number;
};

const ATTENDED: AttendedSeed[] = [
  {
    id: 'past-sunset-hike',
    type: 'group',
    title: 'Lekki sunset hike',
    daysAgo: 8,
    hour: 17,
    placeName: 'Lekki Conservation Centre',
    cityId: 'lagos',
    lat: 6.4413,
    lng: 3.5357,
    goingCount: 9,
    host: 5,
  },
  {
    id: 'past-food-crawl',
    type: 'plan',
    title: 'Lagos food crawl',
    daysAgo: 20,
    hour: 18,
    placeName: 'Lagos, Nigeria',
    cityId: 'lagos',
    lat: 6.4311,
    lng: 3.4215,
    goingCount: 5,
    host: 2,
  },
  {
    id: 'past-design-mixer',
    type: 'event',
    title: 'Design week mixer',
    daysAgo: 35,
    hour: 19,
    placeName: 'London, UK',
    cityId: 'london',
    lat: 51.5226,
    lng: -0.0824,
    goingCount: 12,
    host: 4,
  },
  {
    id: 'past-osu-art-walk',
    type: 'meetup',
    title: 'Osu art walk',
    daysAgo: 52,
    hour: 10,
    placeName: 'Osu, Accra',
    cityId: 'accra',
    lat: 5.5571,
    lng: -0.1818,
    goingCount: 7,
    host: 1,
  },
];

function attendedPost(s: AttendedSeed): DemoPost {
  return {
    id: s.id,
    type: s.type,
    status: 'published',
    title: s.title,
    description: '',
    startAt: iso(at(-s.daysAgo, s.hour, 0)),
    placeName: s.placeName,
    lat: s.lat,
    lng: s.lng,
    cityId: s.cityId,
    capacity: null,
    goingCount: s.goingCount,
    priceCents: null,
    currency: null,
    externalUrl: null,
    visibility: 'open',
    showOnMap: false,
    waitlistEnabled: false,
    images: images(s.id),
    hostIndex: s.host,
    interestIds: [],
    checklist: [],
    rsvpState: 'going',
    reported: false,
  };
}

// What the demo person attended opens on the post page like any other post.
registerArchive((id) => {
  const seed = ATTENDED.find((s) => s.id === id);
  return seed ? attendedPost(seed) : undefined;
});

export const tripRoutes: DemoRoute[] = [
  [
    'GET',
    /^\/api\/v1\/me\/posts$/,
    (_m, req, q) => {
      const status = q.get('status') === 'draft' ? 'draft' : 'published';
      const now = new Date().toISOString();
      // Newest first: the store holds my posts in the order they were made.
      const mine = store.posts
        .filter((p) => p.hostIndex === 'me' && p.status === status)
        .reverse()
        .map((p) => ({
          ...card(p, req.headers),
          status: p.status,
          publishedAt: p.status === 'published' ? now : null,
          updatedAt: now,
        }));
      return page(mine, q);
    },
  ],
  [
    'GET',
    /^\/api\/v1\/me\/attended$/,
    (_m, req, q) =>
      page(
        ATTENDED.map((s) => card(attendedPost(s), req.headers)),
        q,
      ),
  ],
];
