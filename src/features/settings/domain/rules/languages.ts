/**
 * Languages a traveller can say they speak, as ISO 639-1 codes (what
 * `extras.languages` stores, spec §6) with their English names. The order is
 * the picker's: the most spoken by Ajala's travellers first.
 */
export const LANGUAGES: readonly { code: string; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'yo', name: 'Yoruba' },
  { code: 'ig', name: 'Igbo' },
  { code: 'ha', name: 'Hausa' },
  { code: 'sw', name: 'Swahili' },
  { code: 'ar', name: 'Arabic' },
  { code: 'zh', name: 'Mandarin' },
  { code: 'hi', name: 'Hindi' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'nl', name: 'Dutch' },
  { code: 'zu', name: 'Zulu' },
  { code: 'am', name: 'Amharic' },
  { code: 'tw', name: 'Twi' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ru', name: 'Russian' },
  { code: 'tr', name: 'Turkish' },
];

/** "en" → "English"; an unlisted code is shown as itself. */
export const languageName = (code: string) =>
  LANGUAGES.find((l) => l.code === code)?.name ?? code.toUpperCase();
