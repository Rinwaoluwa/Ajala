import type { ExploreErrorCode } from '../domain/entities/ExploreError';
import type { PostType } from '../domain/entities/Explore';

/** Every word Explore shows, in one place. */
export const exploreCopy = {
  map: {
    // The field on the map. Its Search key opens the Explore list on what was typed (`MapSearchBar`).
    searchPlaceholder: 'Search activities...',
    // What follows is the wording of the results that were listed under the field as it was
    // typed in (`RESULTS_HERE`, off).
    activitiesHeading: 'Activities',
    searching: 'Searching…',
    // Search looks within 30 km of where the feed looks (spec §2.18): said, so nothing found is understood.
    noActivities: (words: string) => `No activities for “${words}” within 30 km.`,
    activitiesFailed: "Couldn't search right now.",
    retrySearch: 'Try again',
    /** Read out for a result: what choosing it does. */
    showOnMap: 'Show on the map',
    seeAllResults: 'See all results',
    searchPeople: (words: string) => `Search people for “${words}”`,
    placesHeading: 'Places',
    peopleHeading: 'People',
    noPeople: 'No one by that name or @handle',
    peopleFailed: "Couldn't search for people right now",
    // The first chip over the map: every interest, as the design draws it.
    allInterests: 'All interests',
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
    emptyFiltered: 'Nothing here matches your filters',
    clearFilters: 'Clear filters',
    pricesFailed: "Couldn't check prices for the price filter.",
    noPlaces: 'No matching cities',
    placesFailed: "Place search isn't available right now",
    // Not drawn: a free reader's map only reaches 30 km round where they are (`reach: 'radius'`).
    outsideReach: 'Activities show within 30 km of you.',
    outsideReachTeleported: (place: string) => `Activities show within 30 km of ${place}.`,
    // The button that opens Travel. People read "travel", never "teleport" (product, 23 Nov).
    teleport: 'Travel',
    // Not drawn: 404 NO_LOCATION on the map. Tapping offers a place (Travel).
    choosePlace: 'Choose a place',
  },
  filters: {
    title: 'Filters',
    date: 'Date',
    anyDate: 'Any date',
    today: 'Today',
    weekend: 'This weekend',
    price: 'Price',
    anyPrice: 'Any price',
    free: 'Free',
    paid: 'Paid',
    maxPriceHeading: 'Maximum price',
    /** Read out for the typed maximum: "Maximum price (NGN)". */
    maxPrice: (currency: string) => `Maximum price (${currency})`,
    /** Read out for the currency button: "Currency, Nigerian naira. Change". */
    changeCurrency: (name: string) => `Currency, ${name}. Change`,
    noLimit: 'No limit',
    // Not drawn: one-tap maximums, so most people never need the keyboard; Custom types one.
    custom: 'Custom',
    customPlaceholder: 'Enter a maximum',
    reset: 'Reset',
    apply: 'Apply filters',
  },
  card: {
    close: 'Close',
    more: 'More options',
    preview: 'Preview',
    report: 'Report activity',
    cancel: 'Cancel',
    rsvp: 'RSVP',
    rsvpPriced: (price: string) => `RSVP · ${price}`,
    // A private post asks its host first; the button still says Join (product, 24 Nov: "Request
    // to join" broke over two lines beside Preview), and reads Requested once it is sent.
    request: 'Join',
    requested: 'Requested',
    going: 'Going',
    waitlisted: (n: number | null) => (n ? `Waitlisted · #${n}` : 'Waitlisted'),
    hosting: "You're hosting",
    joined: (n: number) => `${n} joined`,
    left: (n: number) => `${n} left`,
    loadFailed: "Couldn't load this activity.",
    retry: 'Try again',
  },
  // Join, as a pill on a card in the list (`JoinPill`): what it says before and after.
  join: {
    join: 'Join',
    // A private post asks its host first; the button says Join all the same, then Requested.
    request: 'Join',
    going: 'Going',
    requested: 'Requested',
    waitlisted: 'Waitlisted',
    hosting: 'Hosting',
    leaveTitle: 'Leave this one?',
    leaveBody: 'You can join again later if there is still room.',
    stay: 'Stay',
    leave: 'Leave',
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
    // Names what it searches, so the first search is a good one.
    searchPlaceholder: 'Search activities or people',
    cancel: 'Cancel',
    clearSearch: 'Clear search',
    // Search needs two characters (spec §2.18).
    searchTooShort: 'Type at least 2 characters to search.',
    searchHint: 'Search for an activity by what it is, or for a person by name or @handle.',
    searchFor: (words: string) => `Search for “${words}”`,
    recent: 'Recent searches',
    clearRecent: 'Clear',
    searchAgain: (words: string) => `Search for ${words} again`,
    removeRecent: (words: string) => `Remove ${words} from recent searches`,
    browseInterest: 'Interest',
    browseBy: (name: string) => `Browse ${name}`,
    scopes: { activities: 'Activities', people: 'People' },
    // Search looks within 30 km of where the feed looks (spec §2.18): said, so an empty answer is understood.
    noActivities: (words: string) => `No activities for “${words}”`,
    noActivitiesBody: 'Search looks within 30 km of you. Try other words, or look for a person instead.',
    seePeople: 'Search people',
    noPeople: (words: string) => `No one found for “${words}”`,
    noPeopleBody: 'Try their first name or @handle, or look for an activity instead.',
    seeActivities: 'Search activities',
    peopleFailed: "Couldn't search for people right now.",
    peopleCapped: 'Showing the first 100. Try a fuller name or the @handle.',
    openPerson: (name: string) => `Open ${name}'s profile`,
    resultsFailed: "Couldn't search right now.",
    resultsCapped: 'Showing the first 100. Add words to narrow it down.',
    showMore: 'Show more',
    interests: 'Browse By Interest',
    viewAllInterests: 'View all',
    showFewerInterests: 'Show fewer',
    interestsFailed: "Couldn't load interests.",
    nearby: 'Meetups Near You',
    nearbyFor: (interest: string) => `${interest} Near You`,
    // Not "Show all": "View all" sits just above it, on the interests.
    showAllMeetups: 'All meetups',
    nearbySubtitle: 'Good company, just around the corner',
    nearbyEmpty: 'No meetups nearby yet. Check back soon.',
    nearbyNoInterest: 'No meetups for that interest nearby yet.',
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
  noLocation: 'Turn on location, or choose a place, to see activities.',
  placesUnavailable: "Place search isn't available right now.",
  network: 'No connection. Check your internet and try again.',
  sessionExpired: 'Your session ended. Sign in again to continue.',
  notFound: "This activity isn't available any more.",
  postFull: 'This activity is full.',
  postStarted: 'This activity has already started.',
  postCancelled: 'The host cancelled this activity.',
  alreadyReported: "You've already reported this activity. We're looking into it.",
  // The spec's wording for 403 REPORTING_PAUSED (§5).
  reportingPaused: 'Reporting is paused on your account. You can still block people.',
  conflict: 'This activity just changed. Have another look and try again.',
  ownPost: "You can't report your own activity.",
  detailsRequired: 'Tell us a little about what happened.',
  rateLimited: 'Too many tries. Wait a moment and try again.',
  unknown: 'Something went wrong. Try again.',
};
