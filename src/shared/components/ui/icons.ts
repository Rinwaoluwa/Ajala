import type { NativeIconSource } from './NativeIcon';

/**
 * Every glyph the shared components draw, as an SF Symbol for iOS paired with an
 * Android vector drawable.
 *
 * Android glyphs are Material Symbols (outlined) from `@expo/material-symbols`,
 * except the filled check circle, which that package does not ship. Add new icons
 * here rather than naming an SF Symbol inline: an inline name renders nothing on
 * Android.
 */
export const icons = {
  back: {
    symbol: 'arrow.left',
    android: require('@expo/material-symbols/arrow_back.xml') as number,
  },
  show: {
    symbol: 'eye',
    android: require('@expo/material-symbols/visibility.xml') as number,
  },
  hide: {
    symbol: 'eye.slash',
    android: require('@expo/material-symbols/visibility_off.xml') as number,
  },
  calendar: {
    symbol: 'calendar',
    android: require('@expo/material-symbols/calendar_today.xml') as number,
  },
  mail: {
    symbol: 'envelope',
    android: require('@expo/material-symbols/mail.xml') as number,
  },
  checkCircle: {
    symbol: 'checkmark.circle.fill',
    android: require('../../../../assets/icons/android/check_circle_fill.xml') as number,
  },
} satisfies Record<string, NativeIconSource>;
