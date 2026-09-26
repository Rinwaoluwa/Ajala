import { Icon } from '@expo/ui';
import { Icon as ComposeIcon } from '@expo/ui/jetpack-compose';

import type { NativeIconProps } from './NativeIcon';

/**
 * Android: a Jetpack Compose icon from an XML vector drawable.
 *
 * `size` is given in the iOS sense, where an SF Symbol's glyph is about as big as
 * its point size. A Material Symbol is drawn inside a 24-unit box with roughly two
 * units of padding on each side, so the same number would draw it smaller. Symbols
 * are scaled up to match; a brand mark's drawable has no padding and is not.
 *
 * A brand mark (`image`) is drawn untinted so it keeps its own colours.
 */

/** 24-unit Material box ÷ ~20-unit glyph. */
const MATERIAL_SCALE = 1.2;

export function NativeIcon({ source, size, color }: NativeIconProps) {
  if ('image' in source) {
    return source.android != null ? (
      <ComposeIcon source={source.android} size={size} tint={null} />
    ) : null;
  }
  return source.android != null ? (
    <Icon name={source.android} size={size * MATERIAL_SCALE} color={color} />
  ) : null;
}
