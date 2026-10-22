/**
 * Comparing app versions, for the forced update (spec §2.1 step 2: "if the
 * installed build is older than `minAppVersion`, show a forced-update prompt").
 *
 * `minAppVersion` arrives as `major.minor.patch` ("1.0.0" in the OpenAPI example
 * and on the dev API), the same form as `version` in app.json. Compared part by
 * part as numbers, so "1.10.0" is newer than "1.9.0" — string comparison gets
 * that backwards.
 *
 * Lenient about form, strict about meaning: a leading "v", a missing part ("1.2"
 * is "1.2.0") and a pre-release or build suffix ("1.2.0-beta.1", "1.2.0+45") are
 * read; anything without a leading number is not a version at all.
 */

export type Version = readonly [number, number, number];

export function parseVersion(raw: string): Version | null {
  const match = /^\s*v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:[-+].*)?\s*$/i.exec(raw);
  if (!match) return null;
  return [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)];
}

/** Negative when `a` is older than `b`, zero when equal, positive when newer. */
export function compareVersions(a: Version, b: Version): number {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

/**
 * True only when both versions can be read and the installed one is older.
 *
 * Anything unreadable lets the person in. A forced update is a lock on the whole
 * app; a typo in the server's config, or a build whose version cannot be read,
 * must not be able to shut everyone out. The server still refuses calls it can no
 * longer serve.
 */
export function isUpdateRequired(installed: string, minimum: string): boolean {
  const have = parseVersion(installed);
  const need = parseVersion(minimum);
  if (!have || !need) return false;
  return compareVersions(have, need) < 0;
}
