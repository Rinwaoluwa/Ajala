import { useEffect, useState, type ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { useTheme } from '@shared/hooks/useTheme';

import { tabBarTop } from './FloatingTabBar';
import {
  PAGE_GAP,
  PagerStep,
  cornerRoundness,
  easeOutPower,
  landingPage,
  runToRest,
  screenCornerRadius,
  startsInSwipeZone,
  swipeEdge,
} from './pageSwipe';

/**
 * The app's pages side by side, swiped between with a finger: Home, Explore,
 * Trips and Profile. Built from a frame-by-frame study of a reference recording
 * (docs/design/page-swipe-motion.md).
 *
 *   - The pages are one row, a 12pt strip of black between each two. A sideways
 *     drag moves the row with the finger, point for point, so the page being
 *     left and the page arriving are both in view.
 *   - While it moves, each page is a card the shape of the screen: its corners
 *     are round, on the black. At rest it is square and fills the screen.
 *   - Nothing fades, dims, shrinks or lags behind. Whatever floats over the
 *     pages (the tab bar) stays where it is.
 *   - Let go, the row runs on to the page it is thrown at, or to the one showing
 *     most, on a steep ease-out with no bounce: about a third of a second from
 *     half way (`runToRest`). One page a swipe. It can be caught again mid-run.
 *
 * How it is moved. The row is a scroll view nobody can scroll by hand. The drag
 * is the gesture library's, read on the UI thread, and each frame it tells the
 * scroll view where to be (`scrollTo`). A scroll view is told directly; a view
 * moved by an animated style goes through the same queue as React's own
 * drawing, and waits whenever a screen is drawing (see `FloatingTabBar`), which
 * is exactly when a page comes into view.
 *
 * What is inside keeps its own gestures. Up and down is the page's scroll: a
 * drag that starts that way is never a swipe. Rows that scroll sideways (a
 * post's photos, a row of pills) are the gesture library's scroll views, which
 * keep a touch once they move, so swiping one never turns the page.
 *
 * A page whose whole surface is dragged for something else (a map) says so
 * (`swipeFrom: 'edges'`). On it a swipe starts only from a strip down each side
 * of the screen, or from the band at its foot where the tab bar is; anywhere
 * else the drag is the page's own. The page lays `PageSwipeZones` over its map
 * so those places belong to the swipe alone.
 *
 * What floats over the pages (`children`: the tab bar) is inside the swipe's
 * reach too: a sideways drag that starts on the bar turns the page, on any page.
 *
 * With Reduce Motion the row still follows the finger, since that is the person
 * moving it, but it does not run on by itself: let go, the page is simply there.
 */

/** A sideways drag is a swipe after this far: far enough that a scroller inside a page takes the drag first. */
const GRAB = 20;
/** Up or down this far first: a scroll, never a swipe. */
const SCROLL_FIRST = 14;
/** The colour between the pages: the phone's own bezel. */
const BETWEEN = '#000000';

export type SwipePage = {
  key: string;
  /** What the page shows. Nothing yet: the page is its background until there is. */
  content: ReactNode;
  /**
   * Where on the page a swipe may start. `edges`: only the sides of the screen
   * and the band at its foot, for a page that is dragged sideways itself (a map).
   */
  swipeFrom?: 'anywhere' | 'edges';
};

export type SwipePagerProps = {
  pages: readonly SwipePage[];
  /** The page in front. Changed from outside (a tab tapped), the row jumps there: no slide. */
  index: number;
  /** A swipe has taken hold of the row. It is over when `onLand` is next called. */
  onSwipeStart?: () => void;
  /** The page the swipe is heading for, as it goes (it changes half way, and when it is let go). */
  onHeading?: (index: number) => void;
  /**
   * The row has come to rest on this page: after a swipe (it may be the page it
   * left), and after a change of `index` from outside has been followed.
   */
  onLand: (index: number) => void;
  /** What floats over the pages and stays put as they move: the tab bar. */
  children?: ReactNode;
};

export function SwipePager({ pages, index, onSwipeStart, onHeading, onLand, children }: SwipePagerProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const span = width + PAGE_GAP;
  const count = pages.length;
  const radius = screenCornerRadius(insets.top, Platform.OS === 'ios');
  // Where a swipe may start on a page that keeps sideways drags for itself.
  const edge = swipeEdge(Platform.OS === 'ios');
  const band = tabBarTop(insets.bottom);
  const edgesOnly = pages.map((page) => page.swipeFrom === 'edges');

  const row = useAnimatedRef<ScrollView>();
  // How far the row has moved, in points: `index × span` at rest.
  const offset = useSharedValue(index * span);
  // Where the row and the finger were when the drag took hold, and the page it started from.
  const heldOffset = useSharedValue(0);
  const heldAt = useSharedValue(0);
  const from = useSharedValue(index);
  // A finger has the row: from the drag taking hold until it is let go.
  const dragging = useSharedValue(false);
  // The page last reported as where the swipe is heading.
  const headed = useSharedValue(index);

  // The row goes where `offset` says, the frame it says it.
  useAnimatedReaction(
    () => offset.value,
    (now, before) => {
      if (now !== before) scrollTo(row, now, 0, false);
    },
  );
  // The row runs ahead of `index` (see `PagerStep`): a change of `index` is either this
  // pager's own landing coming back or a change from outside, and only the second is followed.
  const [step] = useState(() => new PagerStep(index));
  // The count of changes from outside, where the UI thread can read it to stamp a landing.
  const epoch = useSharedValue(0);
  const tell = (page: number, under: number) => {
    // Overtaken by a change from outside: the row is no longer there.
    if (step.landed(page, under)) onLand(page);
  };
  useEffect(() => {
    if (!step.changed(index)) return;
    // From outside (a tab tapped, a link opened): there at once, whatever the row was doing.
    // A drag still under way is let go of (`dragging`), and its landing will not be told.
    epoch.set(step.epoch);
    cancelAnimation(offset);
    dragging.set(false);
    offset.set(index * span);
    headed.set(index);
    onLand(index);
    // `onLand` is whatever the owner passes this render; only a change of place matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, span, offset, dragging, headed, epoch, step]);

  /** Let go (or the touch taken away): the row runs on to its page. `speed` is the row's, points a second. */
  const letGo = (speed: number) => {
    'worklet';
    dragging.set(false);
    const page = landingPage(offset.value, span, speed, from.value, count);
    const to = page * span;
    const distance = Math.abs(to - offset.value);
    if (page !== headed.value) {
      headed.set(page);
      if (onHeading) scheduleOnRN(onHeading, page);
    }
    if (reduceMotion || distance < 0.5) {
      offset.set(to);
      scheduleOnRN(tell, page, epoch.value);
      return;
    }
    const run = runToRest(distance, span, to > offset.value ? speed : -speed);
    const power = run.power;
    offset.set(
      withTiming(
        to,
        {
          duration: run.duration,
          easing: (t: number) => {
            'worklet';
            return easeOutPower(t, power);
          },
        },
        (finished) => {
          // Not finished: caught again mid-run (that drag will land it), or sent elsewhere.
          if (finished) scheduleOnRN(tell, page, epoch.value);
        },
      ),
    );
  };

  const swipe = Gesture.Pan()
    .enabled(count > 1)
    // Either way, whichever page is in front: which pages there are to go to is worked out
    // below, on the UI thread, from where the row is. Going by `index` here would wait for
    // React to hear of each landing, and a second swipe straight after the first (back the
    // way it came, say) would not start until it had.
    .activeOffsetX([-GRAB, GRAB])
    .failOffsetY([-SCROLL_FIRST, SCROLL_FIRST])
    .onTouchesDown((e, state) => {
      // The first finger down on a page that keeps sideways drags for itself (a map): only
      // its sides and the band at its foot start a swipe. Anywhere else this never begins,
      // and the drag is the page's.
      if (dragging.value || e.numberOfTouches !== 1) return;
      const under = Math.min(count - 1, Math.max(0, Math.round(offset.value / span)));
      const touch = e.allTouches[0];
      if (!edgesOnly[under] || !touch) return;
      if (!startsInSwipeZone(touch.absoluteX, touch.absoluteY, width, height, edge, band)) state.fail();
    })
    .onStart((e) => {
      // Caught mid-run: it stops where it is and goes with the finger from there.
      cancelAnimation(offset);
      dragging.set(true);
      heldOffset.set(offset.value);
      heldAt.set(e.translationX);
      from.set(Math.round(offset.value / span));
      headed.set(from.value);
      if (onSwipeStart) scheduleOnRN(onSwipeStart);
    })
    .onUpdate((e) => {
      // Let go of by a change from outside while the finger was still down: the rest of this
      // drag moves nothing.
      if (!dragging.value) return;
      // One page either way from where it began, and never past the first or last.
      const least = Math.max(0, (from.value - 1) * span);
      const most = Math.min((count - 1) * span, (from.value + 1) * span);
      const want = heldOffset.value - (e.translationX - heldAt.value);
      const next = Math.min(most, Math.max(least, want));
      offset.set(next);
      // The page showing most: past half way, the swipe is heading for the next one.
      const showing = Math.round(next / span);
      if (showing !== headed.value) {
        headed.set(showing);
        if (onHeading) scheduleOnRN(onHeading, showing);
      }
    })
    // The finger's speed, turned round: a drag left moves the row on.
    .onEnd((e) => {
      if (dragging.value) letGo(-e.velocityX);
    })
    .onFinalize(() => {
      // The touch was taken away without an ending (it should not be, but a row left between
      // two pages would be worse than a guess): to the page showing most.
      if (dragging.value) letGo(0);
    });

  const corners = useAnimatedStyle(() => ({ opacity: cornerRoundness(offset.value, span) }));
  // Where the row starts. Later changes are `offset`'s to make, not this prop's.
  const [start] = useState(() => ({ x: index * span, y: 0 }));

  return (
    <GestureDetector gesture={swipe}>
      <View style={{ flex: 1, backgroundColor: BETWEEN }}>
        <ScrollView
          ref={row}
          horizontal
          // Moved only by the swipe above, never scrolled by hand.
          scrollEnabled={false}
          contentOffset={start}
          showsHorizontalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          // The status bar's tap belongs to the page's own list.
          scrollsToTop={false}
          // It holds every screen: a tap while the keyboard is up goes to what was tapped.
          keyboardShouldPersistTaps="always"
          // The page size can change (a window resized): put the row back on its page.
          onContentSizeChange={() => row.current?.scrollTo({ x: offset.get(), y: 0, animated: false })}
          style={{ flex: 1 }}
        >
          {pages.map((page, i) => (
            <View
              key={page.key}
              // Only the page in front is there for a screen reader.
              accessibilityElementsHidden={i !== index}
              importantForAccessibility={i === index ? 'auto' : 'no-hide-descendants'}
              style={{
                width,
                marginRight: PAGE_GAP,
                // A row inside that runs past the screen's edge must not show on the next page.
                overflow: 'hidden',
                backgroundColor: theme.background,
              }}
            >
              {page.content}
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, corners]}>
                <Corner radius={radius} at="topLeft" />
                <Corner radius={radius} at="topRight" />
                <Corner radius={radius} at="bottomLeft" />
                <Corner radius={radius} at="bottomRight" />
              </Animated.View>
            </View>
          ))}
        </ScrollView>
        {children}
      </View>
    </GestureDetector>
  );
}

const CORNERS = {
  topLeft: { top: 0, left: 0, transform: [] },
  topRight: { top: 0, right: 0, transform: [{ scaleX: -1 }] },
  bottomLeft: { bottom: 0, left: 0, transform: [{ scaleY: -1 }] },
  bottomRight: { bottom: 0, right: 0, transform: [{ scaleX: -1 }, { scaleY: -1 }] },
} as const;

/**
 * What a rounded corner leaves outside it, in the colour between the pages:
 * laid over a page's corner, the page looks rounded. Cheaper than clipping a
 * whole screen to a radius that changes every frame.
 */
function Corner({ radius, at }: { radius: number; at: keyof typeof CORNERS }) {
  const { transform, ...place } = CORNERS[at];
  return (
    <View style={[{ position: 'absolute', width: radius, height: radius, transform }, place]}>
      <Svg width={radius} height={radius}>
        {/* The square's corner, less the quarter circle that curves through it. */}
        <Path d={`M0 0 H${radius} A${radius} ${radius} 0 0 0 0 ${radius} Z`} fill={BETWEEN} />
      </Svg>
    </View>
  );
}
