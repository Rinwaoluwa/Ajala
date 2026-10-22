import { Platform } from 'react-native';

/** Figma "Turn on location to explore AJALA" (light and dark). */
export const locationAccessCopy = {
  title: 'Turn on location\nto explore AJALA',
  body: 'Location access is required to use AJALA. Turn it on to discover experiences and travellers around you.',
  /** Only once the system will no longer ask: the way back is through Settings. */
  settingsHint:
    Platform.OS === 'android'
      ? 'In Settings, choose Permissions, then Location, and select \u201CAllow only while using the app\u201D.'
      : 'In Settings, choose Location, then select \u201CWhile Using the App\u201D.',
  openSettings: 'Open Settings',
  /** Before the system prompt has been shown. Not drawn: the design has only the blocked frame. */
  allow: 'Turn on location',
} as const;
