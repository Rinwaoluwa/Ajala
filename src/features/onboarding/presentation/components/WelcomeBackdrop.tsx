import { View } from 'react-native';

import { Logo, SwirlPattern, Text } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

import { welcomeCopy } from '../copy';

/**
 * The welcome page without its buttons: the swirl, and the logo and tagline
 * centred in the space above them.
 *
 * From the Figma welcome frames (light, and the fourth dark onboarding frame),
 * and "Splash / Continue" in the splash spec. The buttons are `WelcomeActions`,
 * kept apart because in the tour they do not move with the page: they sit in the
 * fixed action bar, where Skip / Next give way to them.
 *
 * `reservedBottom` is the height the buttons take at the foot of the screen, so
 * the logo centres in what is left, as designed.
 */

const LOGO_WIDTH = 229;

export type WelcomeBackdropProps = {
  reservedBottom: number;
};

export function WelcomeBackdrop({ reservedBottom }: WelcomeBackdropProps) {
  const theme = useTheme();

  return (
    <View className="flex-1 bg-background">
      <SwirlPattern color={theme.pattern} />
      <View
        className="flex-1 items-center justify-center px-20"
        style={{ paddingBottom: reservedBottom }}
      >
        <Logo width={LOGO_WIDTH} />
        <Text variant="bodyXs" tone="muted" className="mt-8 text-center">
          {welcomeCopy.tagline}
        </Text>
      </View>
    </View>
  );
}
