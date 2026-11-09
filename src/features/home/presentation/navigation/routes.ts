/** The home feature's places in the route tree. Route files read these. */
export const homeRoutes = {
  feed: '/(app)/(tabs)',
  /**
   * The Travel city picker; takes the feed's teleport name as `place` (empty
   * when the feed follows the phone) and `teleported` ('1') while on a teleport.
   */
  travel: '/(app)/travel',
} as const;
