/** The home feature's places in the route tree. Route files read these. */
export const homeRoutes = {
  feed: '/(app)/(tabs)',
  /** The Travel city picker; takes the current city as `city` and `country`. */
  travel: '/(app)/travel',
} as const;
