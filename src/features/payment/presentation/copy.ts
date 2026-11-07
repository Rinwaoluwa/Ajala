import type { SubscriptionErrorCode } from '../domain/entities/SubscriptionError';

/** The Travel paywall's words (Figma "Travel to London"). Copy not drawn there is marked. */
export const travelPaywallCopy = {
  title: (city: string) => `Travel to ${city}`,
  anywhere: 'Travel anywhere',
  body: (city: string) =>
    `Explore meetups, events and plans in ${city} before you arrive with a Travel subscription.`,
  bodyAnywhere:
    'Explore meetups, events and plans in any city before you arrive with a Travel subscription.',
  benefits: [
    'Browse any city worldwide',
    'Priority alerts for top events',
    'Discover plans before you arrive',
    'Multi-city saved locations',
  ],
  subscribe: 'Subscribe',
  // The design's price. The real one will come from the App Store / Play product once purchase is built.
  price: '$10/month',
  later: 'Maybe later',

  // Not drawn: Subscribe in a build that cannot buy yet (no store SDK; see the README).
  notInBuild: {
    title: 'Not available yet',
    body: "Purchases aren't available in this build yet. Travel will be on sale here once it's in the App Store and Google Play.",
    ok: 'OK',
  },

  // Not drawn: the paywall for someone already subscribed.
  subscribed: {
    title: 'Travel is on',
    body: 'Teleport to any city from the city picker on Home.',
    renews: (date: string) => `Renews on ${date}`,
    ends: (date: string) => `Ends on ${date}`,
    grace: "There's a problem with your payment. The store is retrying, and Travel stays on meanwhile.",
    complimentary: (date: string | null) =>
      date ? `Complimentary, until ${date}` : 'Complimentary from Ajala',
    active: 'Active',
    manage: 'Manage subscription',
    done: 'Done',
  },

  errors: {
    // The spec's wording for a 503 from the subscription endpoints (§5).
    unavailable: "Purchases aren't available right now. Try again later.",
    noWebSubscription: "We couldn't find a web subscription to manage.",
    network: 'No connection. Check your internet and try again.',
    sessionExpired: 'Your session ended. Sign in again to continue.',
    unknown: 'Something went wrong. Try again in a moment.',
    openFailed: "We couldn't open the subscription settings on this phone.",
  } satisfies Record<SubscriptionErrorCode | 'openFailed', string>,
} as const;
