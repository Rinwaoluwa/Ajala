/** Where creating a post lives in the route tree; the wizard takes the chosen `type`. */
export const createPostRoutes = {
  wizard: '/(app)/create/[type]',
} as const;
