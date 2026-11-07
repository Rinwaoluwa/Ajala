/**
 * The demo world (`EXPO_PUBLIC_DEMO=1`): cities, interests, hosts and posts
 * shaped exactly as the API sends them (docs/api spec §6). Photos and avatars
 * come from public placeholder services, so they need a connection.
 *
 * Times are relative to now — something today, tomorrow, this week — so the
 * map's "Happening today" and the cards' dates always have something to show.
 */

export type DemoCity = {
  id: string;
  name: string;
  countryCode: string;
  countryName: string;
  region: string;
  label: string;
  timezone: string;
  lat: number;
  lng: number;
};

const city = (
  id: string,
  name: string,
  countryCode: string,
  countryName: string,
  lat: number,
  lng: number,
  timezone: string,
): DemoCity => ({
  id,
  name,
  countryCode,
  countryName,
  region: '',
  label: `${name}, ${countryName}`,
  timezone,
  lat,
  lng,
});

export const DEMO_CITIES: DemoCity[] = [
  city('lagos', 'Lagos', 'NG', 'Nigeria', 6.4541, 3.3947, 'Africa/Lagos'),
  city('abuja', 'Abuja', 'NG', 'Nigeria', 9.0765, 7.3986, 'Africa/Lagos'),
  city('accra', 'Accra', 'GH', 'Ghana', 5.6037, -0.187, 'Africa/Accra'),
  city('nairobi', 'Nairobi', 'KE', 'Kenya', -1.2921, 36.8219, 'Africa/Nairobi'),
  city('cape-town', 'Cape Town', 'ZA', 'South Africa', -33.9249, 18.4241, 'Africa/Johannesburg'),
  city('london', 'London', 'GB', 'United Kingdom', 51.5072, -0.1276, 'Europe/London'),
  city('amsterdam', 'Amsterdam', 'NL', 'Netherlands', 52.3676, 4.9041, 'Europe/Amsterdam'),
  city('paris', 'Paris', 'FR', 'France', 48.8566, 2.3522, 'Europe/Paris'),
  city('lisbon', 'Lisbon', 'PT', 'Portugal', 38.7223, -9.1393, 'Europe/Lisbon'),
  city('barcelona', 'Barcelona', 'ES', 'Spain', 41.3874, 2.1686, 'Europe/Madrid'),
  city('dubai', 'Dubai', 'AE', 'United Arab Emirates', 25.2048, 55.2708, 'Asia/Dubai'),
  city('new-york', 'New York', 'US', 'United States', 40.7128, -74.006, 'America/New_York'),
  city('toronto', 'Toronto', 'CA', 'Canada', 43.6532, -79.3832, 'America/Toronto'),
];

export const DEMO_INTERESTS = [
  { id: 'coffee', slug: 'coffee', name: 'Coffee spots', emoji: '☕' },
  { id: 'food', slug: 'food', name: 'Food & drink', emoji: '🍲' },
  { id: 'music', slug: 'music', name: 'Live music', emoji: '🎶' },
  { id: 'art', slug: 'art', name: 'Arts & culture', emoji: '🎨' },
  { id: 'hiking', slug: 'hiking', name: 'Hiking', emoji: '🥾' },
  { id: 'nightlife', slug: 'nightlife', name: 'Nightlife', emoji: '🍸' },
  { id: 'photography', slug: 'photography', name: 'Photography', emoji: '📷' },
  { id: 'markets', slug: 'markets', name: 'Markets', emoji: '🛍️' },
  { id: 'wellness', slug: 'wellness', name: 'Wellness', emoji: '🧘' },
  { id: 'tech', slug: 'tech', name: 'Tech & startups', emoji: '💻' },
  { id: 'cycling', slug: 'cycling', name: 'Cycling', emoji: '🚲' },
  { id: 'beach', slug: 'beach', name: 'Beach days', emoji: '🏖️' },
];

export const DEMO_HOSTS = [
  { id: 'h-tolu', displayName: 'Tolu A.', avatarUrl: 'https://i.pravatar.cc/150?img=47', verified: true },
  { id: 'h-kemi', displayName: 'Kemi O.', avatarUrl: 'https://i.pravatar.cc/150?img=45', verified: true },
  { id: 'h-james', displayName: 'James K.', avatarUrl: 'https://i.pravatar.cc/150?img=12', verified: false },
  { id: 'h-amara', displayName: 'Amara N.', avatarUrl: 'https://i.pravatar.cc/150?img=32', verified: true },
  { id: 'h-lena', displayName: 'Lena V.', avatarUrl: 'https://i.pravatar.cc/150?img=25', verified: false },
  { id: 'h-seun', displayName: 'Seun B.', avatarUrl: 'https://i.pravatar.cc/150?img=59', verified: true },
];

/**
 * What search knows about each host beyond the card: their handle and home city,
 * for `GET /search/people`. The same as their profiles in `routes/profiles.ts`.
 */
export const DEMO_HOST_DETAILS: Record<string, { handle: string; homeCityId: string }> = {
  'h-tolu': { handle: 'tolu.travels', homeCityId: 'lagos' },
  'h-kemi': { handle: 'kemi.o', homeCityId: 'lagos' },
  'h-james': { handle: 'jamesk', homeCityId: 'nairobi' },
  'h-amara': { handle: 'amara.n', homeCityId: 'lagos' },
  'h-lena': { handle: 'lena.v', homeCityId: 'amsterdam' },
  'h-seun': { handle: 'seun.b', homeCityId: 'lagos' },
};

/** A photo set for a post: the API's three sizes of one picture each. */
export const images = (seed: string, count = 3) =>
  Array.from({ length: count }, (_, i) => ({
    thumbUrl: `https://picsum.photos/seed/${seed}-${i}/200/200`,
    cardUrl: `https://picsum.photos/seed/${seed}-${i}/800/800`,
    fullUrl: `https://picsum.photos/seed/${seed}-${i}/1600/1600`,
  }));

type Seed = {
  id: string;
  type: 'meetup' | 'event' | 'plan' | 'group';
  title: string;
  description: string;
  /** Days from today, then the local hour and minute. */
  when: [number, number, number];
  /** How long it runs, for `endAt`; without it the post has no end time. */
  hours?: number;
  placeName: string;
  lat: number;
  lng: number;
  capacity: number | null;
  goingCount: number;
  /** Whole naira per person, or null for free. */
  priceNgn: number | null;
  visibility: 'open' | 'private';
  waitlistEnabled?: boolean;
  externalUrl?: string;
  /** An index into DEMO_HOSTS, or `'me'` for a post the demo person hosts. */
  host: number | 'me';
  interests: string[];
  /** An Event's running order. */
  schedule?: string[];
  /** A Plan's stops, in order. */
  itinerary?: string[];
  /** A Plan or Group sharing a cost: the whole bill in naira, split this many ways. */
  cost?: { totalNgn: number; expectedCount: number };
  /** A Group that meets again. */
  recurrence?: 'weekly' | 'biweekly' | 'monthly';
};

/** The Lagos posts the demo starts with. */
export const DEMO_POST_SEEDS: Seed[] = [
  {
    id: 'p-coffee-chat',
    type: 'meetup',
    title: 'Coffee & Chat',
    description:
      'A relaxed morning coffee for travellers new to Lagos. Swap tips, plans and recommendations.',
    when: [0, 18, 30],
    placeName: 'The Nest, Victoria Island',
    lat: 6.4311,
    lng: 3.4215,
    capacity: 12,
    goingCount: 7,
    priceNgn: null,
    visibility: 'open',
    host: 0,
    interests: ['coffee'],
    hours: 2,
  },
  {
    id: 'p-tech-founders',
    type: 'meetup',
    title: 'Lagos Tech Founders Networking',
    description: 'Founders, builders and curious travellers meeting over small chops and big ideas.',
    when: [2, 18, 0],
    placeName: 'The Nest, Yaba',
    lat: 6.5095,
    lng: 3.3711,
    capacity: 60,
    goingCount: 47,
    priceNgn: null,
    visibility: 'private',
    host: 5,
    interests: ['tech'],
  },
  {
    id: 'p-afrobeats',
    type: 'event',
    title: 'Afrobeats After Hours',
    description: 'Live DJs, Afrobeats classics and new releases until late. Dress to dance.',
    when: [3, 19, 0],
    placeName: 'The House, Victoria Island',
    lat: 6.4281,
    lng: 3.4219,
    capacity: 300,
    goingCount: 300,
    priceNgn: 5000,
    visibility: 'open',
    externalUrl: 'https://tix.africa',
    host: 3,
    interests: ['music', 'nightlife'],
    hours: 5,
    schedule: ['7pm Doors and warm-up set', '9pm Live band', '11pm Headline DJ', '1am Last dance'],
  },
  {
    id: 'p-art-stories',
    type: 'event',
    title: 'Art & City Stories',
    description: 'A guided walk through new work at the convention centre, with the artists.',
    when: [4, 11, 0],
    placeName: 'Eko Convention Centre',
    lat: 6.4253,
    lng: 3.4064,
    capacity: null,
    goingCount: 12,
    priceNgn: null,
    visibility: 'open',
    host: 1,
    interests: ['art', 'photography'],
    hours: 3,
    schedule: ['11am Welcome and coffee', '11:30am Guided walk', '1pm Q&A with the artists'],
  },
  {
    id: 'p-cultural',
    type: 'meetup',
    title: 'Black American Cultural Celebration',
    description:
      'Join us for a weekend of soul food, jazz, and community. We’ll explore local art, share stories, and celebrate the richness of Black American heritage together.',
    when: [0, 17, 30],
    placeName: 'Lekki, Lagos',
    lat: 6.4474,
    lng: 3.4706,
    capacity: 10,
    goingCount: 4,
    priceNgn: 15000,
    visibility: 'private',
    host: 0,
    interests: ['food', 'music'],
  },
  {
    id: 'p-lekki-market',
    type: 'plan',
    title: 'Lekki Arts & Crafts Market Run',
    description: 'A Saturday morning at the market, then lunch. Bring cash and a tote bag.',
    when: [1, 9, 30],
    placeName: 'Lekki Arts & Crafts Market',
    lat: 6.4421,
    lng: 3.4802,
    capacity: 8,
    goingCount: 3,
    priceNgn: 7500,
    visibility: 'open',
    host: 2,
    interests: ['markets', 'food'],
    hours: 5,
    itinerary: ['Meet at the market gate', 'Fabrics and beads', 'Woodwork row', 'Lunch at Terra Kulture'],
  },
  {
    id: 'p-tarkwa',
    type: 'plan',
    title: 'Tarkwa Bay Beach Day',
    description: 'Boat from the jetty, a day on the sand, back before sunset.',
    when: [5, 10, 0],
    placeName: 'Tarkwa Bay',
    lat: 6.3967,
    lng: 3.3863,
    capacity: 15,
    goingCount: 9,
    priceNgn: null,
    visibility: 'open',
    host: 4,
    interests: ['beach'],
    hours: 7,
    itinerary: [
      'Boat from Tarkwa Bay jetty',
      'Swim and lunch on the beach',
      'Lighthouse walk',
      'Boat back before sunset',
    ],
    cost: { totalNgn: 180000, expectedCount: 15 },
  },
  {
    id: 'p-sunday-ride',
    type: 'group',
    title: 'Sunday Morning Ride',
    description: 'An easy-paced ride along the coast every Sunday. Bikes can be rented nearby.',
    when: [6, 7, 0],
    placeName: 'Bar Beach, Victoria Island',
    lat: 6.4196,
    lng: 3.4105,
    capacity: 25,
    goingCount: 14,
    priceNgn: null,
    visibility: 'open',
    waitlistEnabled: true,
    host: 5,
    interests: ['cycling', 'wellness'],
    hours: 2,
    recurrence: 'weekly',
    cost: { totalNgn: 50000, expectedCount: 25 },
  },
  {
    id: 'p-yoga',
    type: 'group',
    title: 'Sunset Yoga Circle',
    description: 'All levels welcome. Mats provided; bring water.',
    when: [0, 19, 15],
    placeName: 'Ikoyi Club',
    lat: 6.4474,
    lng: 3.4334,
    capacity: 20,
    goingCount: 20,
    priceNgn: null,
    visibility: 'open',
    waitlistEnabled: true,
    host: 1,
    interests: ['wellness'],
    hours: 1,
    recurrence: 'weekly',
  },
  {
    id: 'p-photo-walk',
    type: 'meetup',
    title: 'Golden Hour Photo Walk',
    description: 'Street photography around Freedom Park. Any camera, including your phone.',
    when: [1, 16, 30],
    placeName: 'Freedom Park, Lagos Island',
    lat: 6.4489,
    lng: 3.3986,
    capacity: 15,
    goingCount: 6,
    priceNgn: null,
    visibility: 'open',
    host: 4,
    interests: ['photography', 'art'],
  },
  {
    id: 'p-jazz',
    type: 'event',
    title: 'Jazz on the Terrace',
    description: 'A quartet, a terrace and the lagoon breeze.',
    when: [2, 20, 0],
    placeName: 'Terra Kulture, Victoria Island',
    lat: 6.4355,
    lng: 3.4227,
    capacity: 150,
    goingCount: 88,
    priceNgn: 10000,
    visibility: 'open',
    externalUrl: 'https://tix.africa',
    host: 3,
    interests: ['music'],
    hours: 3,
    schedule: ['8pm First set', '9:15pm Interval', '9:45pm Second set'],
  },
  {
    id: 'p-suya',
    type: 'meetup',
    title: 'Suya Crawl in Ikeja',
    description: 'Three spots, one evening, plenty of pepper.',
    when: [3, 18, 30],
    placeName: 'Allen Avenue, Ikeja',
    lat: 6.6018,
    lng: 3.3515,
    capacity: 10,
    goingCount: 5,
    priceNgn: 6000,
    visibility: 'open',
    host: 2,
    interests: ['food', 'nightlife'],
  },
  {
    // Hosted by the demo person, and private: open it to see the host's side —
    // two people asking to join, with Accept / Decline (routes/postDetail.ts).
    id: 'p-my-rooftop',
    type: 'meetup',
    title: 'Sunset Rooftop Hangout',
    description: 'Drinks, city views and good company. New to Lagos? Come say hi.',
    when: [4, 18, 0],
    placeName: 'Radisson Blu rooftop, Victoria Island',
    lat: 6.4308,
    lng: 3.4136,
    capacity: 12,
    goingCount: 3,
    priceNgn: null,
    visibility: 'private',
    host: 'me',
    interests: ['nightlife', 'food'],
  },
];
