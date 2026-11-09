import type { PostType } from '../domain/entities/Feed';

/** The home feed's words, from the Figma frames. Copy not drawn there is marked. */

export const homeCopy = {
  // Not drawn: the frames show a home city, which the feed no longer has; it follows the phone.
  deviceSubtitle: 'Exploring where you are',
  // The header's big line when the server names no region for the phone's location.
  nearYou: 'Near you',
  // Not drawn; the spec's wording (§2.11) for a feed a Travel teleport has moved.
  teleportedTo: (place: string) => `Teleported to ${place}`,
  // A teleport whose name is not known yet (the place lookup failed).
  teleported: 'Teleported',
  chooseCity: 'Choose a city',
  // The header with no location and no teleport (404 NO_LOCATION).
  choosePlace: 'Choose a place',
  locationOff: 'Location is off',
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
    body: (type: string, place: string) => `No ${type} ${place} right now. Check back soon, or create one.`,
    near: (place: string) => `in ${place}`,
    nearYou: 'near you',
  },
  // Not drawn: 404 NO_LOCATION, no location and no teleport. Not a failure: ask, or offer a place.
  noLocation: {
    title: 'See what’s around you',
    body: 'Turn on location to see activities near you, or choose a place to explore.',
    turnOn: 'Turn on location',
    choose: 'Choose a place',
  },
  failed: {
    title: "We couldn't load the feed",
    network: 'Check your connection and try again.',
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
  // The phone's own location, where coming home lands. The design's "Your city" and Popular
  // grid are gone: the feed follows the phone, not a home city, and Swagger has no popular list.
  yourLocation: 'Where you are',
  yourLocationBody: (region: string | null) => region ?? 'Your phone’s location',
  recent: 'Recent',
  results: 'Results',
  here: 'Here',
  // Not drawn: what Travel shows under "Where you are" before anything is typed.
  searchHint: 'Search for a city to see what’s on there.',
  noResults: 'No cities match that.',
  placesFailed: "Place search isn't available right now.",
  searchFailed: "Couldn't search right now.",
  retry: 'Try again',
  // Not drawn: why a teleport did not happen (a 402 opens the paywall instead).
  moveFailed: {
    notACity: "That isn't a city we can take you to. Pick another.",
    unavailable: "Teleport isn't available right now. Try again in a moment.",
    network: 'No connection. Check your internet and try again.',
    other: "We couldn't move you there. Try again in a moment.",
  },
} as const;
