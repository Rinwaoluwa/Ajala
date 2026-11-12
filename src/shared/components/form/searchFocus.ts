/**
 * Tapping outside a focused search field puts the keyboard away (product, 12 Nov).
 *
 * The fields are native (SwiftUI / Compose, through Expo UI), so React Native's
 * own "tap outside" handling (`Keyboard.dismiss`, a ScrollView's
 * `keyboardShouldPersistTaps`) never reaches them: they have to be told to blur.
 *
 * How a touch is placed: touch events bubble through the React tree, the field
 * first and the app's root last. A touch that starts in the focused field's
 * frame marks itself on the way up (`markFieldTouch`); when it reaches the
 * root (`rootTouch`) unmarked, it started somewhere else, and the field blurs.
 * The touch itself carries on, so tapping a search result still picks it.
 *
 * Search fields (`TextField` `clearable`), and fields that ask for it
 * (`dismissOnOutsideTap`, e.g. a number pad, which has no return key). A
 * chat's message box keeps its keyboard when Send is tapped, as messaging apps do.
 */

type Field = { blur: () => void };

let focused: Field | null = null;
let touchInField = false;

export const searchFocus = {
  /** A search field took focus. */
  focus(field: Field) {
    focused = field;
  },
  /** A search field lost focus (its own blur, or ours). */
  blurred(field: Field) {
    if (focused === field) focused = null;
  },
  /** A touch started inside a search field's frame. */
  markFieldTouch() {
    touchInField = true;
  },
  /** Every touch, at the app's root. Blurs the focused search field when the touch began elsewhere. */
  rootTouch() {
    const inField = touchInField;
    touchInField = false;
    if (inField || !focused) return;
    const field = focused;
    focused = null;
    field.blur();
  },
};
