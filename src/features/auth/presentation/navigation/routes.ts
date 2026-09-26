/**
 * Where the sign-up flow lives in the app's route tree. Route files read these,
 * so a moved screen is one edit here rather than a search through `app/`.
 */
export const signUpRoutes = {
  options: '/(auth)/sign-up',
  details: '/(auth)/sign-up/details',
  verify: '/(auth)/sign-up/verify',
  preferences: '/(auth)/sign-up/preferences',
  signIn: '/(auth)/sign-in',
} as const;
