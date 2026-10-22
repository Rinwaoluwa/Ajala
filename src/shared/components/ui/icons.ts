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
  // The status-sheet badges (Figma modal-8 variants): info, warning, error.
  info: {
    symbol: 'info.circle',
    android: require('@expo/material-symbols/info.xml') as number,
  },
  warning: {
    symbol: 'exclamationmark.triangle',
    android: require('@expo/material-symbols/warning.xml') as number,
  },
  close: {
    symbol: 'xmark',
    android: require('@expo/material-symbols/close.xml') as number,
  },
  search: {
    symbol: 'magnifyingglass',
    android: require('@expo/material-symbols/search.xml') as number,
  },
  location: {
    symbol: 'location.circle',
    android: require('@expo/material-symbols/my_location.xml') as number,
  },
  person: {
    symbol: 'person.fill',
    android: require('@expo/material-symbols/person.xml') as number,
  },
  add: {
    symbol: 'plus',
    android: require('@expo/material-symbols/add.xml') as number,
  },
  check: {
    symbol: 'checkmark',
    android: require('@expo/material-symbols/check.xml') as number,
  },
  faceId: {
    symbol: 'faceid',
    android: require('@expo/material-symbols/face.xml') as number,
  },
  touchId: {
    symbol: 'touchid',
    android: require('@expo/material-symbols/fingerprint.xml') as number,
  },
  lock: {
    symbol: 'lock.fill',
    android: require('@expo/material-symbols/lock.xml') as number,
  },
  chevronDown: {
    symbol: 'chevron.down',
    android: require('@expo/material-symbols/keyboard_arrow_down.xml') as number,
  },
  chevronLeft: {
    symbol: 'chevron.left',
    android: require('@expo/material-symbols/chevron_left.xml') as number,
  },
} satisfies Record<string, NativeIconSource>;
