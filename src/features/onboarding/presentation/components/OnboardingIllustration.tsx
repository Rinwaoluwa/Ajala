import { Image } from 'expo-image';
import { View, useColorScheme } from 'react-native';

import { useTheme } from '@shared/hooks/useTheme';

import { REFERENCE_AREA_HEIGHT, type OnboardingIllustration as Illustration } from '../onboardingImages';

/**
 * The art at the top of a slide, full width and under the status bar.
 *
 * Laid out at the design's 393×852 frame, where the area is 527pt tall, and scaled
 * with the area: a `figure` keeps its natural size relative to the area and rests
 * on its bottom edge, a `fill` covers it.
 *
 * Every illustration fades into the screen background at its foot, as the light
 * exports already do. That fade is what lets light art sit on Night until the
 * dark exports exist (see onboardingImages.ts).
 *
 * Decorative: the slide's heading carries its meaning.
 */

/** The foot fade, at the reference size. */
const FADE_HEIGHT = 48;

/** Long enough to read as a fade rather than a pop, short enough not to feel slow. */
const IMAGE_FADE_MS = 220;

export type OnboardingIllustrationProps = {
  illustration: Illustration | undefined;
  height: number;
};

export function OnboardingIllustration({ illustration, height }: OnboardingIllustrationProps) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const scale = height / REFERENCE_AREA_HEIGHT;
  const source =
    scheme === 'dark' ? (illustration?.darkSource ?? illustration?.source) : illustration?.source;

  return (
    <View
      style={{
        height,
        overflow: 'hidden',
        experimental_backgroundImage: `linear-gradient(to bottom, ${theme.illustrationBackdrop}, ${theme.background})`,
      }}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {illustration && source !== undefined ? (
        <Image
          source={source}
          contentFit={illustration.layout === 'fill' ? 'cover' : 'contain'}
          cachePolicy="memory-disk"
          transition={IMAGE_FADE_MS}
          style={
            illustration.layout === 'fill'
              ? { width: '100%', height: '100%' }
              : {
                  position: 'absolute',
                  bottom: 0,
                  alignSelf: 'center',
                  width: illustration.width * scale,
                  height: illustration.height * scale,
                }
          }
        />
      ) : null}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: FADE_HEIGHT * scale,
          // The background at zero alpha, not `transparent`: fading from
          // transparent black would grey the middle of the fade.
          experimental_backgroundImage: `linear-gradient(to bottom, ${theme.background}00, ${theme.background})`,
        }}
      />
    </View>
  );
}
