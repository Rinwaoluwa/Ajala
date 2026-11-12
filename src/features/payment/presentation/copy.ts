import type { SubscriptionErrorCode } from '../domain/entities/SubscriptionError';

/** The Travel paywall's words (Figma "Travel to London"). Copy not drawn there is marked. */
export const travelPaywallCopy = {
  title: (city: string) => `Travel to ${city}`,
  anywhere: 'Travel anywhere',
  // Not drawn: the paywall opened from a Plan (creating or opening one), a Pro feature (10 Nov).
  // Not drawn: opened from a post outside the reader's area (MOB-077).
  distance: {
    title: 'See posts anywhere',
    body: 'Free members see posts near them. Open and join posts in any city with a Travel subscription.',
  },
  plans: {
    title: 'Plans are a Pro feature',
    body: 'Create plans, and see the plans other travellers make, with a Travel subscription.',
  },
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
  // Travel is a weekly plan (backend answers D4; Figma's "$10/month" is out of
  // date). The amount is never written here: it is the store product's own
  // localised price, in the buyer's currency.
  // TODO(purchase): pass the App Store / Play product's localised price once buying is built.
  price: (storePrice: string | null) => (storePrice ? `${storePrice} per week` : 'Weekly'),
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
    // A 503 from the subscription endpoints (subscriptions off, or that store's
    // keys not set), or a 500 from buying (the store failed or timed out). Both
    // are worth another go later (backend answers D4).
    unavailable: "Purchases aren't available right now. Please try again.",
    noWebSubscription: "We couldn't find a web subscription to manage.",
    network: 'No connection. Check your internet and try again.',
    sessionExpired: 'Your session ended. Sign in again to continue.',
    unknown: 'Something went wrong. Try again in a moment.',
    openFailed: "We couldn't open the subscription settings on this phone.",
  } satisfies Record<SubscriptionErrorCode | 'openFailed', string>,
} as const;
