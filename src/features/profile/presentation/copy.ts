import type { ProfileErrorCode } from '../domain/entities/ProfileError';
import type { HandleFormatProblem } from '../domain/rules/handleRules';

/** Profile setup's words, from the Figma frames. Copy not drawn there is marked. */

export const setupCopy = {
  back: 'Back',
  continue: 'Continue',
  skip: 'Skip',

  basics: {
    title: 'Set up your profile',
    body: 'Add a few details so travellers know a little about you.',
    addPhoto: 'Add profile photo',
    changePhoto: 'Change photo',
    photoSheet: {
      title: 'Profile photo',
      library: 'Choose from library',
      camera: 'Take photo',
      remove: 'Remove photo',
      cancel: 'Cancel',
    },
    currentCity: 'Current city',
    cityDetecting: 'Finding your city...',
    cityUnknown: 'City not found yet',
    autoDetected: 'Auto-detected',
    // The city is always where the phone is; these say why it is missing and how to fix it.
    cityMissing: {
      noPermission: {
        body: 'Ajala uses your location to set your current city.',
        action: 'Allow location',
      },
      blocked: {
        body: 'Location is off for Ajala. Turn it on in Settings to set your current city.',
        action: 'Open Settings',
      },
      notFound: {
        body: "We couldn't find your city. Check your connection and try again.",
        action: 'Try again',
      },
    },
    languages: 'Languages spoken',
    // Not drawn. Gender is optional; name and date of birth are asked only when missing (§2.4).
    gender: 'Gender (optional)',
    fullName: { label: 'Full name', placeholder: 'Enter your full name' },
    dateOfBirth: {
      label: 'Date of birth',
      placeholder: 'DD/MM/YYYY',
      sheetTitle: 'Date of birth',
    },
  },

  travelStyle: {
    title: 'How do you like to travel?',
    body: 'Choose up to 10 styles that best describe your trips.',
    section: 'Travel style',
  },

  destinations: {
    title: 'Where do you love to travel?',
    body: 'Choose up to 10 favourite destinations to personalise your experience.',
    search: 'Search city or country...',
    // The design's "Popular destinations" came from `GET /cities/popular`, which is gone:
    // the chosen cities sit here, and a fixed list of well-known cities below offers quick searches.
    section: 'Your destinations',
    noneChosen: 'Search for a city, or start with one of these.',
    /** Over the quick searches: tapping one searches for that city. */
    tryASearch: 'Popular searches',
    noMatches: 'No cities match that.',
  },

  interests: {
    title: 'What are you into?',
    body: 'Choose 5\u20138 interests to personalise your experience.',
    loadFailed: "We couldn't load the interests.",
    retry: 'Try again',
  },

  saving: {
    label: 'Saving your profile',
    failedTitle: "We couldn't save your profile",
    retry: 'Try again',
  },

  displayName: {
    header: 'Set up your preferences',
    title: 'Choose your display name',
    body: 'This is how other travellers will see you on Ajala.',
    label: 'Display name',
    placeholder: 'Enter your display name',
    later: 'You can change this later.',
    available: 'Available',
    suggestions: 'Suggestions',
  },

  biometric: {
    body: (name: string) => `Use ${name} for a quicker, secure way back to AJALA.`,
    instruction: (name: string) =>
      `Tap Enable ${name}, then follow your device's prompt. You can still sign in with your password.`,
    enable: (name: string) => `Enable ${name}`,
    notNow: 'Not now',
    prompt: (name: string) => `Turn on ${name} for AJALA`,
    failed: (name: string) => `${name} didn't work. Try again, or choose Not now.`,
  },

  allSet: {
    title: "You're all set!",
    message: (name: string | null) =>
      name
        ? `Welcome, ${name}! Your next adventure starts here.`
        : 'Welcome! Your next adventure starts here.',
    action: 'Start exploring',
  },
} as const;

export const handleFormatMessages: Record<HandleFormatProblem, string> = {
  tooShort: 'Use at least 3 characters.',
  tooLong: 'Use 20 characters or fewer.',
  characters: 'Use letters, numbers, full stops and underscores only.',
};

export const handleUnavailableMessages = {
  taken: 'That name is taken. Try another, or one of the suggestions.',
  reserved: "That name isn't available. Try another.",
  format: 'Use 3–20 letters, numbers, full stops or underscores.',
} as const;

export const profileErrorMessages: Record<ProfileErrorCode, string> = {
  handleTaken: handleUnavailableMessages.taken,
  handleCooldown: "You changed your name recently, so it can't be changed again yet.",
  handleInvalid: handleUnavailableMessages.format,
  imageTooLarge: 'That photo is too large. Choose a smaller one.',
  imageNotSupported: "That file isn't a photo we can use. Choose a JPEG, PNG or WebP.",
  invalidDetails: "Some of those details weren't accepted. Check them and try again.",
  notFound: "This profile isn't available.",
  alreadyReported: "You've already reported this profile. We're looking into it.",
  ownProfile: "You can't do that to your own profile.",
  placesUnavailable: "Place search isn't available right now",
  rateLimited: 'Too many tries. Wait a moment and try again.',
  network: 'No connection. Check your internet and try again.',
  sessionExpired: 'Your session has ended. Sign in again to carry on.',
  unknown: 'Something went wrong. Try again.',
};
