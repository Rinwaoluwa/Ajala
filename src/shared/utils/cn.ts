/**
 * Joins class names, dropping falsy values.
 *
 * Deliberately not `tailwind-merge`: NativeWind resolves conflicting utilities by
 * specificity at build time, and pulling in a merge library to "fix" conflicts
 * tends to hide the real problem, which is a component taking a className it
 * should have exposed as a prop.
 */
export const cn = (...parts: (string | false | null | undefined)[]): string =>
  parts.filter(Boolean).join(' ');
