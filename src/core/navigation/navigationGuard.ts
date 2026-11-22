import { router, type Href } from 'expo-router';

import { createRepeatGuard } from '@core/input/repeatGuard';

/**
 * One tap, one screen. Tapping a button twice quickly (the chat icon, a row, a
 * card) ran its handler twice, and `router.push` twice opened the same screen
 * twice, one on top of the other.
 *
 * Every screen in the app is opened through expo-router's `router`
 * (`router.push` / `router.navigate`, some eighty places). Rather than ask each
 * of them to remember, the two are wrapped once, here: asking for the same
 * place again is ignored while the first is still opening, and for `WINDOW_MS`
 * after the app is free again (`createRepeatGuard`: opening a screen keeps the
 * app busy, and the extra taps wait in line behind it, so a plain timer let
 * them through). A different place is never held back, and `replace`, `back`
 * and `dismiss` are left alone, because flows use them one straight after
 * another on purpose (a start screen that replaces itself with the thread it
 * found).
 *
 * `installNavigationGuard` is called once, as the app starts (app/_layout.tsx).
 * A `<Link>` does not go through `router`; the one the app has (a feed post)
 * guards its own press (`usePressOnce`).
 */

/** Counted from when the app is free again: long enough for the new screen to slide over the button. */
const WINDOW_MS = 800;

const keyOf = (href: Href) => (typeof href === 'string' ? href : JSON.stringify(href));

let installed = false;

export function installNavigationGuard(): void {
  if (installed) return;
  installed = true;
  const allow = createRepeatGuard(WINDOW_MS);
  const { push, navigate } = router;
  const once =
    (go: typeof router.push): typeof router.push =>
    (href, options) => {
      const key = keyOf(href);
      if (!allow(key)) {
        if (__DEV__) console.log(`[navigation] ignored a repeat of ${key}`);
        return;
      }
      go(href, options);
    };
  try {
    router.push = once(push);
    router.navigate = once(navigate);
  } catch {
    // The router object would have to be frozen for this to throw; the app still works
    // without the guard, so say so in development and carry on.
    if (__DEV__) console.warn('[navigation] could not install the repeat guard');
  }
}
