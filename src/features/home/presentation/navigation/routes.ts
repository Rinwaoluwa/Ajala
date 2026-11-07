/** The home feature's places in the route tree. Route files read these. */
export const homeRoutes = {
  feed: '/(app)/(tabs)',
  /**
   * The Travel city picker; takes the feed's city as `city`, `country` and
   * `cityId`, and `teleported` ('1') when that city is a teleport.
   */
  travel: '/(app)/travel',
} as const;
