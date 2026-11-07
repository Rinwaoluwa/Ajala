import type { ExploreErrorCode } from '../domain/entities/ExploreError';
import type { PostType } from '../domain/entities/Explore';

/** Every word Explore shows, in one place. */
export const exploreCopy = {
  map: {
    searchPlaceholder: 'Search city or country...',
    filters: 'Filter the map',
    filtersActive: 'Filter the map, filters on',
    locate: 'Show where I am',
    layers: 'Switch map style',
    satelliteOn: 'Satellite view on',
    today: 'Happening today',
    viewList: 'View List',
    loadFailed: "Couldn't load activities",
    retry: 'Retry',
    empty: 'No activities here yet',
    emptyToday: 'Nothing happening here today',
    noPlaces: 'No matching cities',
  },
  filters: {
    title: 'Filter the map',
    types: 'Show',
    all: 'All types',
    today: 'Happening today',
    todayBody: 'Only activities that start today',
  },
  card: {
    close: 'Close',
    more: 'More options',
    preview: 'Preview',
    report: 'Report activity',
    cancel: 'Cancel',
    free: 'Free',
    rsvp: (price: string) => `RSVP · ${price}`,
    request: 'Request to join',
    book: (price: string) => `Book · ${price}`,
    requested: 'Requested',
    going: 'Going',
    waitlisted: (n: number | null) => (n ? `Waitlisted · #${n}` : 'Waitlisted'),
    hosting: "You're hosting",
    joined: (n: number) => `${n} joined`,
    left: (n: number) => `${n} left`,
    // A Plan or Group splitting a cost: the server's per-person share (spec §1.5).
    costEach: (amount: string) => `About ${amount} each`,
    loadFailed: "Couldn't load this activity.",
    retry: 'Try again',
  },
  notice: {
    title: 'Before you RSVP',
    body: "You're joining a pop-up organised by another traveller. AJALA helps you connect, but does not organise or supervise the experience.",
    body2:
      'Review the host and meeting details, meet in a public place, and let someone you trust know your plans. Leave and report anything that feels unsafe.',
    accept: 'I understand, RSVP',
    later: 'Not now',
  },
  report: {
    title: 'Report activity',
    intro: 'Help us keep Ajala safe. Select a reason.',
    details: 'Additional details (required)',
    detailsPlaceholder: 'Tell us what happened...',
    cancel: 'Cancel',
    submit: 'Submit report',
    sentTitle: 'Thanks for telling us',
    sentBody: "We'll review this activity. If it breaks our rules, we'll act on it.",
    sentAction: 'Done',
  },
  list: {
    title: 'Explore',
    subtitle: 'Find your people. Discover your city.',
    searchPlaceholder: 'Search meetups, events, plans...',
    clearSearch: 'Clear search',
    // Not drawn: search needs two characters (spec §2.18).
    searchTooShort: 'Type at least 2 characters to search.',
    results: 'Results',
    resultsEmpty: 'Nothing matches that. Try other words.',
    resultsFailed: "Couldn't search right now.",
    resultsCapped: 'Showing the first 100. Add words to narrow it down.',
    showMore: 'Show more',
    interests: 'Browse By Interest',
    interestsFailed: "Couldn't load interests.",
    nearby: 'Meetups Near You',
    nearbySubtitle: 'Good company, just around the corner',
    nearbyEmpty: 'No meetups nearby yet. Check back soon.',
    nearbyNoInterest: 'No meetups for that interest yet.',
    nearbyFailed: "Couldn't load meetups.",
    retry: 'Try again',
    going: (n: number) => `${n} going`,
  },
};

export const typeLabels: Record<PostType, string> = {
  meetup: 'Meetup',
  event: 'Event',
  plan: 'Plan',
  group: 'Group',
};

/** The glyph the dark design's chips carry before each type. */
export const typeEmoji: Record<PostType, string> = {
  meetup: '🤝',
  event: '🎉',
  plan: '🗺️',
  group: '👥',
};

export const exploreErrorMessages: Record<ExploreErrorCode, string> = {
  noCity: 'Turn on location or set a home city to see activities near you.',
  network: 'No connection. Check your internet and try again.',
  sessionExpired: 'Your session ended. Sign in again to continue.',
  notFound: "This activity isn't available any more.",
  postFull: 'This activity is full.',
  postStarted: 'This activity has already started.',
  postCancelled: 'The host cancelled this activity.',
  externalBooking: 'This event books through its own link.',
  alreadyReported: "You've already reported this activity. We're looking into it.",
  // The spec's wording for 403 REPORTING_PAUSED (§5).
  reportingPaused: 'Reporting is paused on your account. You can still block people.',
  conflict: 'This activity just changed. Have another look and try again.',
  ownPost: "You can't report your own activity.",
  rateLimited: 'Too many tries. Wait a moment and try again.',
  unknown: 'Something went wrong. Try again.',
};
