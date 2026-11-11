import { Image } from 'expo-image';
import type { ColorValue } from 'react-native';

/**
 * A bundled SVG icon from `assets/icons`, drawn with expo-image.
 *
 * `tint` recolours a one-colour icon. Leave it out for art that keeps its own
 * colours — the PRO coin, the Travel badge.
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
  travelBadge: require('../../../../assets/icons/travel-badge.svg') as number,
  // The profile's (supplied 10 Nov 2026): one colour each, drawn in `tint`.
  users: require('../../../../assets/icons/users.svg') as number,
  streak: require('../../../../assets/icons/streak.svg') as number,
  // A one-colour globe (supplied 11 Nov 2026); `earth` is the full-colour one and turns into a blob when tinted.
  countries: require('../../../../assets/icons/countries.svg') as number,
  /** A photo in a circle: the Featured Photos heading. */
  photos: require('../../../../assets/icons/image.svg') as number,
  share: require('../../../../assets/icons/share.svg') as number,
  flag: require('../../../../assets/icons/flag.svg') as number,
  send: require('../../../../assets/icons/send.svg') as number,
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
