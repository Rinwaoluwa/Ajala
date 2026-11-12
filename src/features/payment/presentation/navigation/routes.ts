/** The paywall's place in the route tree; takes `city` and `country` (the destination) and `from`. */
export const paymentRoutes = {
  travelPaywall: '/(app)/travel-paywall',
} as const;

/**
 * The paywall for a locked post card (MOB-077), by the card's `lockReason`:
 * a Plan, or a post outside the reader's area. Tapping one goes straight here,
 * without asking for the post.
 */
export const lockedPostPaywall = (lockReason: 'plan' | 'distance') =>
  ({
    pathname: paymentRoutes.travelPaywall,
    params: { reason: lockReason === 'plan' ? 'plans' : 'distance' },
  }) as const;
