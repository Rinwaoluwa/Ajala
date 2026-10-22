import { View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { palette } from '@shared/theme';

/**
 * The splash loader bar, from Figma "Splash / Initial".
 *
 * A light track with a deep-teal fill. At rest the fill is only a cap at the left
 * end. During the sweep a warm head — coral trailing, marigold leading — runs
 * along the track with the fill behind it, then runs off the far end, leaving the
 * whole bar deep teal. Deep teal is the bottom of the splash gradient, so the
 * finished bar all but disappears into the background, which is what the design
 * does.
 *
 * Purely a display of `sweep` (0 to 1, already eased); `useSplashTimeline` owns
 * the timing. Animated on the UI thread with transforms and widths only.
 *
 * The head is a CSS gradient through React Native's `experimental_backgroundImage`
 * (New Architecture, both platforms), so no gradient module or native rebuild is
 * needed. Its colours are the brand marigold and coral; the spec's estimates
 * (#F2B531, #D9532F) were read off screenshots and sit within a shade of them.
 */

/** Measured from the design at 393pt: 204 × 8, fully rounded. */
export const LOADER_WIDTH = 204;
export const LOADER_HEIGHT = 8;
/** The head's length, from the gap between head and fill in the prototype (§4.1). */
const HEAD_WIDTH = LOADER_WIDTH * 0.25;
/**
 * Where the head's leading edge starts and ends. It starts part-formed, tail
 * hidden under the cap (the prototype first shows it near 20%), and ends clear of
 * the far end so nothing warm is left on the bar.
 */
const HEAD_START = LOADER_WIDTH * 0.15;
const HEAD_END = LOADER_WIDTH + HEAD_WIDTH;
/** The head fades in over the first slice of the sweep, so it is not there at rest. */
const HEAD_FADE_IN = 0.08;

/**
 * Track colour measured from the design (#D9D9D9). The spec estimated white at
 * 85%, but on the gradient that reads blue-green; the frame's pixels are neutral.
 */
const TRACK = '#D9D9D9';

const HEAD_GRADIENT = `linear-gradient(to right, ${palette.tealDark} 0%, ${palette.coral} 45%, ${palette.marigold} 100%)`;

export type SplashLoaderProps = {
  sweep: SharedValue<number>;
};

export function SplashLoader({ sweep }: SplashLoaderProps) {
  const radius = LOADER_HEIGHT / 2;

  const headStyle = useAnimatedStyle(() => {
    const t = sweep.get();
    const lead = HEAD_START + (HEAD_END - HEAD_START) * t;
    return {
      opacity: interpolate(t, [0, HEAD_FADE_IN], [0, 1], 'clamp'),
      transform: [{ translateX: lead - HEAD_WIDTH }],
    };
  });

  const fillStyle = useAnimatedStyle(() => {
    const t = sweep.get();
    const lead = HEAD_START + (HEAD_END - HEAD_START) * t;
    // The fill's rounded end tucks under the head's tail so no seam shows.
    return { width: Math.min(Math.max(lead - HEAD_WIDTH + radius, LOADER_HEIGHT), LOADER_WIDTH) };
  });

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading Ajala"
      accessibilityState={{ busy: true }}
      style={{
        width: LOADER_WIDTH,
        height: LOADER_HEIGHT,
        borderRadius: radius,
        backgroundColor: TRACK,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 0,
            top: 0,
            width: HEAD_WIDTH,
            height: LOADER_HEIGHT,
            borderTopRightRadius: radius,
            borderBottomRightRadius: radius,
            experimental_backgroundImage: HEAD_GRADIENT,
          },
          headStyle,
        ]}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 0,
            top: 0,
            height: LOADER_HEIGHT,
            borderRadius: radius,
            backgroundColor: palette.tealDark,
          },
          fillStyle,
        ]}
      />
    </View>
  );
}
