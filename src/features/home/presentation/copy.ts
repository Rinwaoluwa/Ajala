import type { CitySource, PostType } from '../domain/entities/Feed';

/** The home feed's words, from the Figma frames. Copy not drawn there is marked. */

export const homeCopy = {
  citySubtitle: {
    home: 'Exploring your home city',
    // Not drawn: the frames only show the home-city case.
    device: 'Exploring where you are',
    edge: 'Exploring where you are',
  } satisfies Record<CitySource, string>,
  chooseCity: 'Choose a city',
  // Not drawn: the header while Travel has the feed in another city.
  travellingFrom: (home: string) => `Travelling from ${home}`,
  notifications: 'Notifications',
  messages: 'Messages',
  like: 'Save',
  unlike: 'Saved',

  postType: { meetup: 'Meetup', event: 'Event', plan: 'Plan', group: 'Group' } satisfies Record<
    PostType,
    string
  >,

  level: {
    // A static placeholder until the backend has levels (API map §12), as agreed with product.
    tag: 'Level 2 · Local Explorer',
    progressLabel: '7/10 Experiences',
    progress: 0.7,
    next: '3 more experiences to reach ',
    nextLevel: 'City Insider.',
    view: 'View',
    close: 'Close',
  },

  // Not drawn: what the feed says with nothing in it, or when it fails.
  empty: {
    title: 'Nothing here yet',
    body: (type: string, city: string) => `No ${type} in ${city} right now. Check back soon, or create one.`,
  },
  failed: {
    title: "We couldn't load the feed",
    network: 'Check your connection and try again.',
    noCity: "We couldn't tell which city you're in. Make sure location is on, then try again.",
    unknown: 'Something went wrong on our side. Try again in a moment.',
    retry: 'Try again',
  },
} as const;

export const travelCopy = {
  title: 'Travel',
  subtitle: 'Explore activities in another city',
  search: 'Search city or country...',
  proTitle: 'Travel Pro',
  proBody: 'Explore activities in cities worldwide',
  pro: 'PRO',
  yourCity: 'Your city',
  recent: 'Recent',
  popular: 'Popular',
  results: 'Results',
  home: 'Home',
  noResults: 'No cities match that.',
} as const;
