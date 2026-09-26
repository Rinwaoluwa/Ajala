import { icons, type NativeIconSource } from '@shared/components';

/**
 * Provider marks for the social sign-up buttons.
 *
 * Email takes the label colour in both themes. Google's "G" keeps its own four
 * colours: a PNG on iOS and an untinted vector drawable on Android, both drawn from
 * `assets/icons/brands/google-g.svg`. Before release, replace those with the mark
 * from Google's official Sign-In branding kit.
 *
 * ANDROID: the Apple mark is an SF Symbol, which may only be used on Apple
 * platforms, so the Apple button shows its label alone on Android until the mark
 * from Apple's Sign in with Apple resources is added as a vector drawable.
 */
export const providerIcons = {
  apple: { symbol: 'apple.logo' },
  google: {
    image: require('../../../../assets/icons/brands/google-g.png') as number,
    android: require('../../../../assets/icons/brands/google-g.xml') as number,
  },
  email: icons.mail,
} satisfies Record<string, NativeIconSource>;

export const fieldIcons = {
  calendar: icons.calendar,
} satisfies Record<string, NativeIconSource>;
