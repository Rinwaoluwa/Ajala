/**
 * The @handle ("display name" on screen): 3–20 letters, digits, `.` and `_`
 * (spec §2.4, `UpdateProfileDto`). Checked here before the API is asked, so a
 * handle that can never be valid costs no request — availability is throttled
 * to 10 a minute.
 */

export const HANDLE_MIN = 3;
export const HANDLE_MAX = 20;
const HANDLE_PATTERN = /^[A-Za-z0-9._]+$/;

export type HandleFormatProblem = 'tooShort' | 'tooLong' | 'characters';

/** What the person typed, without the "@" the field already shows, and without spaces. */
export function normalizeHandle(input: string): string {
  return input.trim().replace(/^@+/, '').replace(/\s+/g, '');
}

export function handleFormatProblem(handle: string): HandleFormatProblem | null {
  if (handle.length < HANDLE_MIN) return 'tooShort';
  if (handle.length > HANDLE_MAX) return 'tooLong';
  if (!HANDLE_PATTERN.test(handle)) return 'characters';
  return null;
}

/** A name part reduced to what a handle may hold: "Zoë-Ann" → "zoeann". */
function handlePart(part: string | null | undefined): string {
  return (part ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Up to three handles built from the person's name, offered under the field:
 * "sarah.mitchell", "sarahmitchell", "sarah_m". Not checked for availability
 * until one is picked, so offering them costs nothing.
 */
export function suggestHandles(firstName: string | null, lastName: string | null, limit = 3): string[] {
  const first = handlePart(firstName);
  const last = handlePart(lastName);
  if (!first) return [];

  const candidates = last
    ? [`${first}.${last}`, `${first}${last}`, `${first}_${last[0]}`, `${first[0]}.${last}`]
    : [first, `${first}.travels`, `${first}_ajala`];

  const seen = new Set<string>();
  return candidates
    .map((c) => c.slice(0, HANDLE_MAX).replace(/[._]+$/, ''))
    .filter((c) => handleFormatProblem(c) === null && !seen.has(c) && seen.add(c))
    .slice(0, limit);
}
