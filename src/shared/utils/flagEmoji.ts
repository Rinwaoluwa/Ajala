/**
 * A country's flag as the two regional-indicator letters of its ISO code: "NG"
 * → 🇳🇬. The designs draw flag art per country; this covers every country the
 * API can return with nothing to ship. An unknown code gets a plain white flag.
 */
export function flagEmoji(countryCode: string): string {
  const code = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return '\u{1F3F3}';
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
