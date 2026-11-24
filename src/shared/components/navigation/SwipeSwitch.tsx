import { useEffect, useRef, type ReactNode } from 'react';
import { useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { haptics } from '@shared/feedback/haptics';

/**
 * Views within a screen that take turns in one place, changed with a sideways
 * swipe as well as by their tabs (the profile's My posts · Saved · Going ·
 * Requested). `index` is the view shown.
 *
 * The view follows the finger; let go past a quarter of the screen (or flicked)
 * and the next one takes its place, coming in from that side; not far enough,
 * it springs back. The next view comes in the way Material's "shared axis" does
 * between sibling views: from close by (a third of the way across) and fading
 * up. Whether it came by a swipe or a tap on its tab, it comes in from the side
 * it lies on.
 *
 * These views are not side by side as the app's pages are (`SwipePager`): each
 * is as tall as its own list, and only one is drawn at a time.
 *
 * Only a sideways drag counts: one that starts up or down is the page's scroll.
 * It starts sooner than the swipe between pages around it, so on these views it
 * wins; at the first or last view, a drag that way is not its to take, and
 * turns the page instead.
 *
 * With Reduce Motion the drag still follows the finger (it is the person moving
 * it), but nothing slides on its own: the next view is simply there.
 */

/** How far a drag goes sideways before it counts as a swipe (and not a tap or a scroll). Less than `SwipePager`'s. */
const START = 14;
/** Up or down this far first: it is a scroll, never a swipe. */
const SCROLL_FIRST = 14;
/** Let go past this share of the width, or flicked faster than this, and it moves on. */
const COMMIT_SHARE = 0.25;
const COMMIT_SPEED = 550;
/** A view within a screen, finishing its way out before the next comes in. */
const OUT_MS = 120;
const IN_MS = 240;
/** Where the next view starts, as a share of the width. */
const IN_FROM = 0.3;
const EASE = Easing.out(Easing.cubic);

type Direction = 1 | -1;

/**
 * The drag: follows the finger toward a neighbour that exists, and stiffly
 * (a quarter of the way) toward one that does not. `commit` runs, on the JS
 * thread, once the view has gone out.
 */
function useSwipe({
  x,
  width,
  prev,
  next,
  commit,
}: {
  x: SharedValue<number>;
  width: number;
  prev: boolean;
  next: boolean;
  commit: (direction: Direction) => void;
}) {
  const reduceMotion = useReducedMotion();
  const far = 100_000;
  return Gesture.Pan()
    .enabled(prev || next)
    // A drag left (negative) goes to the next view, right to the previous. Toward a side with
    // nothing there it never starts, so the swipe between pages can take it.
    .activeOffsetX([next ? -START : -far, prev ? START : far])
    .failOffsetY([-SCROLL_FIRST, SCROLL_FIRST])
    .onUpdate((e) => {
      const toward = e.translationX < 0 ? next : prev;
      x.set(toward ? e.translationX : e.translationX * 0.25);
    })
    .onEnd((e) => {
      const direction: Direction = e.translationX < 0 ? 1 : -1;
      const there = direction === 1 ? next : prev;
      const farEnough = Math.abs(e.translationX) > width * COMMIT_SHARE;
      const flicked = Math.abs(e.velocityX) > COMMIT_SPEED && Math.sign(e.velocityX) === -direction;
      if (there && (farEnough || flicked)) {
        if (reduceMotion) {
          scheduleOnRN(commit, direction);
          return;
        }
        x.set(
          withTiming(-direction * width, { duration: OUT_MS, easing: EASE }, (done) => {
            if (done) scheduleOnRN(commit, direction);
          }),
        );
      } else {
        x.set(withSpring(0, { damping: 22, stiffness: 260, overshootClamping: true }));
      }
    });
}

/** Brings a view in from the side it lies on (`from`: 1 the right, -1 the left), fading up. */
function slideIn(
  x: SharedValue<number>,
  shown: SharedValue<number>,
  from: Direction,
  width: number,
  reduceMotion: boolean,
) {
  if (reduceMotion) {
    x.set(0);
    shown.set(1);
    return;
  }
  x.set(from * width * IN_FROM);
  shown.set(0);
  x.set(withTiming(0, { duration: IN_MS, easing: EASE }));
  shown.set(withTiming(1, { duration: IN_MS, easing: EASE }));
}

export function SwipeSwitch({
  index,
  count,
  onChange,
  children,
}: {
  /** The view shown. */
  index: number;
  count: number;
  /** A swipe has moved on: show this one. */
  onChange: (index: number) => void;
  children: ReactNode;
}) {
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const x = useSharedValue(0);
  const opacity = useSharedValue(1);
  // The view shown last, to know which side the new one comes in from.
  const shownIndex = useRef(index);
  useEffect(() => {
    if (index === shownIndex.current) return;
    slideIn(x, opacity, index > shownIndex.current ? 1 : -1, width, reduceMotion);
    shownIndex.current = index;
  }, [index, width, reduceMotion, x, opacity]);

  const swipe = useSwipe({
    x,
    width,
    prev: index > 0,
    next: index < count - 1,
    commit: (direction) => {
      haptics.select();
      onChange(index + direction);
    },
  });
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateX: x.value }] }));
  return (
    <GestureDetector gesture={swipe}>
      <Animated.View style={style}>{children}</Animated.View>
    </GestureDetector>
  );
}
