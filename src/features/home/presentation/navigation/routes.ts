/** The home feature's places in the route tree. Route files read these. */
export const homeRoutes = {
  feed: '/(app)/(tabs)',
  /** The Teleport city picker; takes the current city as `city` and `country`. */
  teleport: '/(app)/teleport',
} as const;
