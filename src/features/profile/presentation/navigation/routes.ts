/**
 * Profile setup in the app's route tree. Route files read these, so a moved
 * screen is one edit here. `start` is also auth's `accountRoutes.profileSetup`.
 */
export const profileSetupRoutes = {
  /** Location first: "Current city" and the app itself need it. */
  start: '/(profile-setup)/location',
  basics: '/(profile-setup)/basics',
  city: '/(profile-setup)/city',
  travelStyle: '/(profile-setup)/travel-style',
  destinations: '/(profile-setup)/destinations',
  interests: '/(profile-setup)/interests',
  saving: '/(profile-setup)/saving',
  displayName: '/(profile-setup)/display-name',
  biometric: '/(profile-setup)/biometric',
} as const;

/** The four numbered steps the indicator counts. */
export const SETUP_STEPS = 4;
