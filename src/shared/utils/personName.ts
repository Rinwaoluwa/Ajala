/**
 * What a person's name may be made of (API changelog, 21 Nov 2026): letters in
 * any script, spaces, apostrophes, hyphens and full stops, with at least one
 * letter. Digits, emoji, other punctuation and invisible characters are a 400
 * (`firstName may contain only letters, spaces, apostrophes, hyphens and full
 * stops`) from `POST /auth/signup/email` and `PATCH /me`, so the forms say so
 * first: email sign-up, profile setup (a Google or Apple account without a
 * name) and Edit profile.
 *
 * Checked against staging (22 Nov): accents pass composed or as combining
 * marks ("Zoë", "Ọládélé"), and so does the curly apostrophe phones type
 * ("O’Brien"). An en dash, underscore or comma does not.
 */
const NAME_WORD = /^[\p{L}\p{M}'’.-]+$/u;
const LETTER = /\p{L}/u;

/**
 * Whether every character is one a name may have. Words are split on
 * whitespace, as the forms split a full name; an empty name has nothing wrong
 * in it (being empty is the form's own complaint).
 */
export function hasOnlyNameCharacters(name: string): boolean {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => NAME_WORD.test(word));
}

/** A first or last name the API takes: only name characters, and a letter among them. */
export function isNameAllowed(name: string): boolean {
  return LETTER.test(name) && hasOnlyNameCharacters(name);
}
