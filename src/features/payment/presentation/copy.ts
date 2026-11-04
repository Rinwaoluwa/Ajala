/** The Travel paywall's words (Figma "Travel to London"). */
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
  // The subscription is not built (API map §12): the button says so, as agreed with product.
  comingSoon: 'Coming soon',
  price: '$10/month',
  later: 'Maybe later',
} as const;
