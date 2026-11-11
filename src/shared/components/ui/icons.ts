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
  clock: {
    symbol: 'clock',
    android: require('@expo/material-symbols/schedule.xml') as number,
  },
  minus: {
    symbol: 'minus',
    android: require('@expo/material-symbols/remove.xml') as number,
  },
  /** The grip on a row that can be dragged into a new place (iOS's reorder lines). */
  dragHandle: {
    symbol: 'line.3.horizontal',
    android: require('@expo/material-symbols/drag_indicator.xml') as number,
  },
  more: {
    symbol: 'ellipsis',
    android: require('@expo/material-symbols/more_horiz.xml') as number,
  },
  flag: {
    symbol: 'flag',
    android: require('@expo/material-symbols/flag.xml') as number,
  },
  filter: {
    symbol: 'line.3.horizontal.decrease',
    android: require('@expo/material-symbols/filter_list.xml') as number,
  },
  layers: {
    symbol: 'square.3.layers.3d',
    android: require('@expo/material-symbols/layers.xml') as number,
  },
  bolt: {
    symbol: 'bolt.fill',
    android: require('@expo/material-symbols/bolt.xml') as number,
  },
  list: {
    symbol: 'list.bullet',
    android: require('@expo/material-symbols/list.xml') as number,
  },
  /** The map's "locate me": a crosshair on iOS, Material's my-location on Android. */
  locate: {
    symbol: 'scope',
    android: require('@expo/material-symbols/my_location.xml') as number,
  },
  chevronRight: {
    symbol: 'chevron.right',
    android: require('@expo/material-symbols/chevron_right.xml') as number,
  },
  share: {
    symbol: 'square.and.arrow.up',
    android: require('@expo/material-symbols/share.xml') as number,
  },
  copy: {
    symbol: 'doc.on.doc',
    android: require('@expo/material-symbols/content_copy.xml') as number,
  },
  block: {
    symbol: 'nosign',
    android: require('@expo/material-symbols/block.xml') as number,
  },
  settings: {
    symbol: 'gearshape',
    android: require('@expo/material-symbols/settings.xml') as number,
  },
  editSquare: {
    symbol: 'square.and.pencil',
    android: require('@expo/material-symbols/edit_square.xml') as number,
  },
  book: {
    symbol: 'book',
    android: require('@expo/material-symbols/menu_book.xml') as number,
  },
  externalLink: {
    symbol: 'arrow.up.right.square',
    android: require('@expo/material-symbols/open_in_new.xml') as number,
  },
  photos: {
    symbol: 'photo.on.rectangle',
    android: require('@expo/material-symbols/photo_library.xml') as number,
  },
  edit: {
    symbol: 'pencil',
    android: require('@expo/material-symbols/edit.xml') as number,
  },
  trash: {
    symbol: 'trash',
    android: require('@expo/material-symbols/delete.xml') as number,
  },
  send: {
    symbol: 'paperplane',
    android: require('@expo/material-symbols/send.xml') as number,
  },
  camera: {
    symbol: 'camera',
    android: require('@expo/material-symbols/photo_camera.xml') as number,
  },
} satisfies Record<string, NativeIconSource>;
