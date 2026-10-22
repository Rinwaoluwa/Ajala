import { Image } from 'expo-image';
import type { ColorValue } from 'react-native';

/**
 * A bundled SVG icon from `assets/icons`, drawn with expo-image.
 *
 * `tint` recolours a one-colour icon. Leave it out for art that keeps its own
 * colours — the PRO coin, the Teleport badge.
 *
 * Icons with an active and an inactive state (the tabs, the heart) are drawn as
 * vectors by `VectorIcon`, and art with a chosen look by `Illustration`. For
 * Expo UI content use `NativeIcon`.
 */

const svg = {
  plus: require('../../../../assets/icons/plus.svg') as number,
  calendar: require('../../../../assets/icons/calender.svg') as number,
  clock: require('../../../../assets/icons/clock.svg') as number,
  earth: require('../../../../assets/icons/earth.svg') as number,
  proCoin: require('../../../../assets/icons/pro-badge.svg') as number,
  check: require('../../../../assets/icons/badge-2.svg') as number,
  teleportBadge: require('../../../../assets/icons/teleport-badge.svg') as number,
};

export type SvgIconName = keyof typeof svg;

export type SvgIconProps = {
  name: SvgIconName;
  /** Width in points; height follows unless given. */
  size: number;
  height?: number;
  tint?: ColorValue;
};

export function SvgIcon({ name, size, height, tint }: SvgIconProps) {
  return (
    <Image
      source={svg[name]}
      style={{ width: size, height: height ?? size }}
      contentFit="contain"
      tintColor={tint as string | undefined}
      accessible={false}
    />
  );
}
