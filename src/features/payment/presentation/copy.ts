/** The Teleport paywall's words (Figma "Teleport to London"). */
export const teleportPaywallCopy = {
  title: (city: string) => `Teleport to ${city}`,
  anywhere: 'Teleport anywhere',
  body: (city: string) =>
    `Explore meetups, events and plans in ${city} before you arrive with a Teleport subscription.`,
  bodyAnywhere:
    'Explore meetups, events and plans in any city before you arrive with a Teleport subscription.',
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
