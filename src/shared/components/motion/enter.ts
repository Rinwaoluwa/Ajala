import { Easing, FadeInDown, ReduceMotion } from 'react-native-reanimated';

/**
 * The app's entrance for content arriving on a screen: a 300ms fade with an 8pt
 * rise, ease-out. Pass `delay` to stagger a column (40–80ms apart reads as one
 * movement, not a queue).
 *
 * Under Reduce Motion Reanimated skips layout animations entirely, so content is
 * simply there — the setting's intent for an entrance.
 *
 *   <Animated.View entering={enterRise(60)}>…</Animated.View>
 */
export const ENTER_MS = 300;
const RISE = 8;

export function enterRise(delay = 0) {
  return FadeInDown.duration(ENTER_MS)
    .delay(delay)
    .easing(Easing.out(Easing.cubic))
    .withInitialValues({ opacity: 0, transform: [{ translateY: RISE }] })
    .reduceMotion(ReduceMotion.System);
}
