/**
 * Padding the platform's native button adds around its content, in points.
 *
 * iOS: none. Expo UI's text button is SwiftUI's `.plain` style, which draws exactly
 * its content. Android is in `nativeButtonInset.android.ts`.
 */
export const NATIVE_BUTTON_INSET = 0;

/** Vertical padding the native button adds around its content. iOS: none. */
export const NATIVE_BUTTON_INSET_VERTICAL = 0;
