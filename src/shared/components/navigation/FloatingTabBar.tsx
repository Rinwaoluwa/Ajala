import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics } from '@shared/feedback/haptics';
import { useKeyboardShown } from '@shared/hooks/useKeyboardShown';
import { useLiquidGlass } from '@shared/hooks/useLiquidGlass';
import { useTheme } from '@shared/hooks/useTheme';
import { fontFamily, palette } from '@shared/theme';

import { GlassBackdrop } from '../surface/GlassBackdrop';
import { GlassSurface } from '../surface/GlassSurface';
import { SvgIcon } from '../ui/SvgIcon';
import { Text } from '../ui/Text';
import { VectorIcon, type VectorIconName } from '../ui/VectorIcon';
import { tabBarMinimize, useTabBarMinimized } from './tabBarMinimize';

/**
 * The app's tab bar: one capsule floating over the content, centred near the
 * foot of the screen, with the round "+" (create) above it on the right. Built
 * from a frame-by-frame study of a reference recording
 * (docs/design/tab-bar-motion.md).
 *
 *   - The current tab sits on a soft pill; its icon is FILLED in Marigold with
 *     a Marigold label. The others are grey outlines (`VectorIcon`).
 *   - Choosing a tab slides the pill to it (240ms), a little larger while it
 *     travels, and pops the icon as it fills. The whole bar swells very slightly
 *     under the finger.
 *   - Scrolling down a tab's list shrinks the bar to one round button at the
 *     left showing the current tab's icon (240ms): the bar's two ends close in,
 *     the other tabs and the label fade, and the icon rides to the button's
 *     middle. Scrolling back up, reaching the top, or tapping the button opens
 *     it again (220ms). A tab's list reports its scrolling with
 *     `useMinimizeTabBarOnScroll`; changing tab always opens the bar.
 *   - The "+" goes with it: as the bar shrinks it slides down to the round
 *     button's line (the two then sit level, left and right), and as the bar
 *     grows it slides back up above it. Same value, same timing.
 *
 * How the shrink is drawn. Nothing changes size: animating the capsule's real
 * width meant a layout pass and a resized glass view on every frame, and it
 * stuttered. Instead the capsule is what two capsule-shaped windows of the same
 * size both show. One stays put; the other slides left over it, and what the
 * two share is a shorter capsule with both ends still round. The glass and the
 * tabs are held still behind them, the whole thing is scaled down a little to
 * the round button's height, and moved to the left margin. So the morph is
 * only transforms and opacity.
 *
 * It is driven by React Native's own `Animated` with the native driver, not by
 * Reanimated like the rest of the app. Reanimated's updates wait their turn
 * behind React's whenever a list is drawing rows, and a bar that shrinks
 * because a list is scrolling got one frame in three: it stepped. The native
 * driver sets the views every frame whatever JavaScript and React are doing.
 *
 * Liquid Glass where the phone has it, the design's solid surface elsewhere.
 * The glass stays frosted (what scrolls under it shows through); a hairline
 * edge and a soft shadow keep the capsule plain to see, because glass alone
 * disappeared into a white page or a pale map. With Reduce Motion the bar never
 * shrinks, the pill jumps rather than slides, and nothing scales.
 *
 * It sizes from the window: the capsule is as wide as its tabs need, never
 * wider than the screen less its margins, and the tabs share it equally. Labels
 * grow with the text size up to 1.3×, beyond which they would collide.
 */

export type TabItem = { key: string; label: string; icon: VectorIconName };

export type FloatingTabBarProps = {
  tabs: readonly TabItem[];
  current: string;
  onSelect: (key: string) => void;
  /** The "+" at the bottom right. Left out, there is none (a tab with its own floating controls there). */
  onCreate?: () => void;
  createLabel: string;
};

/** The capsule's height, and how far its foot is from the screen's. Screens place their own floating pieces by these. */
export const TAB_BAR_HEIGHT = 60;
export const tabBarBottom = (insetBottom: number) => Math.max(insetBottom - 12, 8);
/** The bar's top edge, measured up from the foot of the screen. */
export const tabBarTop = (insetBottom: number) => tabBarBottom(insetBottom) + TAB_BAR_HEIGHT;

const BAR = TAB_BAR_HEIGHT;
/** The round button the bar shrinks to. */
const MINI = 48;
/** The round button is the bar scaled down: the current icon is scaled back up by as much, to stay its size. */
const MINI_SCALE = MINI / BAR;
/** The most a tab takes; on a narrow phone they share what there is. */
const TAB = 84;
/** Between the capsule's edge and the pill under the current tab. */
const PAD = 4;
const SIDE = 20;
const ICON = 24;
/** The icon's top in the bar: fixed, so its middle is known whatever the label's size. */
const ICON_TOP = 9;
const FAB = 56;
/** Between the bar and the "+" above it. */
const FAB_GAP = 14;
/** How far the "+" comes down when the bar shrinks: onto the bar's middle line, level with the round button. */
const FAB_DROP = BAR + FAB_GAP - (BAR - FAB) / 2;
const INACTIVE = '#A4ACB9';

const NATIVE = { useNativeDriver: true } as const;
const SHRINK = { duration: 240, easing: Easing.bezier(0.4, 0, 0.2, 1), ...NATIVE };
const GROW = { duration: 220, easing: Easing.out(Easing.cubic), ...NATIVE };
const SLIDE = { duration: 240, easing: Easing.out(Easing.cubic), ...NATIVE };
const EASE_OUT = Easing.out(Easing.quad);

/** A capsule of the bar's height at the bar's top-left corner: `width` long, or a circle when that is the height. */
const capsule = (width: number) =>
  ({ position: 'absolute', left: 0, top: 0, width, height: BAR, borderRadius: BAR / 2 }) as const;

const between = (value: Animated.Value, from: number, to: number) =>
  value.interpolate({ inputRange: [0, 1], outputRange: [from, to] });

export function FloatingTabBar({ tabs, current, onSelect, onCreate, createLabel }: FloatingTabBarProps) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const glass = useLiquidGlass();
  // On Android the app shrinks above the keyboard (app/_layout.tsx), which would
  // lift the bar onto the keyboard over the text box. It steps aside while typing.
  const keyboardShown = useKeyboardShown();

  const full = Math.min(width - SIDE * 2, tabs.length * TAB + PAD * 2);
  const fullLeft = (width - full) / 2;
  const tabWidth = (full - PAD * 2) / tabs.length;
  const index = Math.max(
    0,
    tabs.findIndex((t) => t.key === current),
  );

  // 0 the whole bar … 1 the round button. Shrunk only where motion is welcome.
  const minimized = useTabBarMinimized() && !reduceMotion;
  const [mini] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const run = Animated.timing(mini, { toValue: minimized ? 1 : 0, ...(minimized ? SHRINK : GROW) });
    run.start();
    return () => run.stop();
  }, [minimized, mini]);
  // A new tab starts with the whole bar.
  useEffect(() => tabBarMinimize.set(false), [current]);

  // Which tab the pill is under (a whole number at rest), and how lifted it is while it travels.
  const [position] = useState(() => new Animated.Value(index));
  const [lift] = useState(() => new Animated.Value(0));
  const [press] = useState(() => new Animated.Value(0));
  const [fabPress] = useState(() => new Animated.Value(0));
  const moved = useRef(false);
  useEffect(() => {
    if (!moved.current) {
      // The first draw: the pill is already where it belongs.
      moved.current = true;
      return;
    }
    if (reduceMotion) {
      position.setValue(index);
      return;
    }
    Animated.timing(position, { toValue: index, ...SLIDE }).start();
    Animated.sequence([
      Animated.timing(lift, { toValue: 1, duration: 90, easing: EASE_OUT, ...NATIVE }),
      Animated.timing(lift, { toValue: 0, duration: 200, easing: EASE_OUT, ...NATIVE }),
    ]).start();
  }, [index, reduceMotion, position, lift]);

  const motion = useMemo(() => {
    // How far the sliding window travels: the bar's length less one round end.
    const close = full - BAR;
    const centre = PAD + tabWidth * (index + 0.5);
    return {
      // The whole bar: scaled to the round button's height about its middle, and moved so its
      // left end lands on the screen's margin. A touch larger under the finger.
      bar: {
        transform: [
          { translateX: between(mini, 0, SIDE - fullLeft - (full * (1 - MINI_SCALE)) / 2) },
          { scale: Animated.multiply(between(mini, 1, MINI_SCALE), between(press, 1, 1.03)) },
        ],
      },
      // The sliding window: what it shares with the still one ends as a circle.
      window: { transform: [{ translateX: between(mini, 0, -close) }] },
      // What is inside the sliding window is moved back by as much: the glass stays still.
      held: { transform: [{ translateX: between(mini, 0, close) }] },
      // The tabs keep their size and slide as one, so the current icon ends in the button's middle.
      tabs: {
        transform: [
          { translateX: between(mini, 0, BAR / 2 - centre) },
          { translateY: between(mini, 0, BAR / 2 - (ICON_TOP + ICON / 2)) },
        ],
      },
      pill: {
        opacity: mini.interpolate({ inputRange: [0, 0.4], outputRange: [1, 0], extrapolate: 'clamp' }),
        transform: [{ translateX: Animated.multiply(position, tabWidth) }, { scale: between(lift, 1, 1.06) }],
      },
      // One shadow for the whole bar and one for the round button, swapped as it shrinks: a
      // shadow cannot follow a clipped shape, and these two never change size.
      barShadow: { opacity: between(mini, 1, 0) },
      miniShadow: { opacity: mini },
      // The "+" rides the same value: down to the round button's line, and back up.
      fab: { transform: [{ translateY: between(mini, 0, FAB_DROP) }, { scale: between(fabPress, 1, 0.94) }] },
      // Gone by half way to the button: the other tabs, and the current tab's label.
      fade: mini.interpolate({ inputRange: [0, 0.5], outputRange: [1, 0], extrapolate: 'clamp' }),
      // The current icon, scaled back up as the bar is scaled down.
      keepSize: between(mini, 1, 1 / MINI_SCALE),
    };
  }, [mini, press, position, lift, fabPress, full, fullLeft, tabWidth, index]);

  if (Platform.OS === 'android' && keyboardShown) return null;

  const pressIn = () => {
    if (!reduceMotion) Animated.timing(press, { toValue: 1, duration: 120, ...NATIVE }).start();
  };
  const pressOut = () => {
    Animated.timing(press, { toValue: 0, duration: 220, ...NATIVE }).start();
  };
  const currentLabel = tabs[index]?.label ?? '';
  const edge = {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dark ? 'rgba(255,255,255,0.18)' : 'rgba(17,24,39,0.14)',
  };
  // Drawn outside the shape only, so it never greys the glass from underneath.
  const shadow = [
    { offsetX: 0, offsetY: 5, blurRadius: 14, spreadDistance: 0, color: dark ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.18)' },
  ];

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 0, right: 0, bottom: tabBarBottom(insets.bottom), height: BAR }}
    >
      <Animated.View style={[{ position: 'absolute', left: fullLeft, top: 0, width: full, height: BAR }, motion.bar]}>
        <Animated.View pointerEvents="none" style={[capsule(full), { boxShadow: shadow }, motion.barShadow]} />
        <Animated.View pointerEvents="none" style={[capsule(BAR), { boxShadow: shadow }, motion.miniShadow]} />

        {/* The still window … */}
        <View style={[capsule(full), { overflow: 'hidden' }]}>
          {/* … and the sliding one. What both show is the capsule. */}
          <Animated.View style={[capsule(full), { overflow: 'hidden' }, motion.window]}>
            <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: full, height: BAR }, motion.held]}>
              {glass ? (
                <>
                  {/* Only a breath of the surface colour under the glass: more and the frost is lost. */}
                  <View
                    style={[
                      StyleSheet.absoluteFill,
                      { backgroundColor: dark ? 'rgba(17,20,23,0.28)' : 'rgba(255,255,255,0.24)' },
                    ]}
                  />
                  <GlassBackdrop variant="regular" tint={null} shape={{ capsule: true }} appearance="auto" />
                </>
              ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.tabBar }]} />
              )}
              {/* The edge of the still window's round end (the sliding window cuts the rest of it away). */}
              <View
                pointerEvents="none"
                style={{ position: 'absolute', left: 0, top: 0, width: BAR / 2, height: BAR, overflow: 'hidden' }}
              >
                <View style={[capsule(BAR), edge]} />
              </View>
              <Animated.View
                accessibilityRole="tablist"
                accessibilityElementsHidden={minimized}
                importantForAccessibility={minimized ? 'no-hide-descendants' : 'auto'}
                style={[{ position: 'absolute', left: 0, top: 0, width: full, height: BAR }, motion.tabs]}
              >
                <Animated.View
                  style={[
                    {
                      position: 'absolute',
                      left: PAD,
                      top: PAD,
                      width: tabWidth,
                      height: BAR - PAD * 2,
                      borderRadius: 999,
                      backgroundColor: dark ? 'rgba(255,255,255,0.10)' : 'rgba(17,24,39,0.06)',
                    },
                    motion.pill,
                  ]}
                />
                <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: PAD }}>
                  {tabs.map((item) => (
                    <TabButton
                      key={item.key}
                      item={item}
                      active={item.key === current}
                      fade={motion.fade}
                      keepSize={motion.keepSize}
                      onPressIn={pressIn}
                      onPressOut={pressOut}
                      onPress={() => {
                        if (item.key !== current) haptics.select();
                        onSelect(item.key);
                      }}
                    />
                  ))}
                </View>
              </Animated.View>
            </Animated.View>
            {/* The sliding window's own edge: its long sides and its right end. */}
            <View
              pointerEvents="none"
              style={{ position: 'absolute', left: BAR / 2, top: 0, right: 0, height: BAR, overflow: 'hidden' }}
            >
              <View style={[capsule(full), { left: -BAR / 2 }, edge]} />
            </View>
          </Animated.View>
        </View>

        {minimized ? (
          // Shrunk, the whole button opens the bar again; it does not change tab.
          <Pressable
            style={{ position: 'absolute', left: 0, top: 0, width: BAR, height: BAR }}
            hitSlop={8}
            onPressIn={pressIn}
            onPressOut={pressOut}
            onPress={() => {
              haptics.tap();
              tabBarMinimize.set(false);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${currentLabel}. Show all tabs`}
          />
        ) : null}
      </Animated.View>

      {onCreate ? (
        <Animated.View style={[{ position: 'absolute', right: SIDE, bottom: BAR + FAB_GAP }, motion.fab]}>
          <GlassSurface
            fallbackColor={theme.primaryFill}
            tint={theme.primaryFill}
            interactive
            shadow={false}
            style={{
              width: FAB,
              height: FAB,
              borderRadius: FAB / 2,
              ...(glass
                ? null
                : {
                    shadowColor: palette.tealDark,
                    shadowOpacity: 0.3,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 8,
                  }),
            }}
          >
            <Pressable
              onPress={() => {
                haptics.impact();
                onCreate();
              }}
              onPressIn={() => {
                if (!reduceMotion) Animated.timing(fabPress, { toValue: 1, duration: 90, ...NATIVE }).start();
              }}
              onPressOut={() => Animated.timing(fabPress, { toValue: 0, duration: 160, ...NATIVE }).start()}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={createLabel}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            >
              <SvgIcon name="plus" size={24} />
            </Pressable>
          </GlassSurface>
        </Animated.View>
      ) : null}
    </View>
  );
}

function TabButton({
  item,
  active,
  fade,
  keepSize,
  onPress,
  onPressIn,
  onPressOut,
}: {
  item: TabItem;
  active: boolean;
  /** 1 … 0 as the bar shrinks: what fades with it. */
  fade: Animated.AnimatedInterpolation<number>;
  /** The scale that keeps the current icon its size inside the scaled-down button. */
  keepSize: Animated.AnimatedInterpolation<number>;
  onPress: () => void;
  onPressIn: () => void;
  onPressOut: () => void;
}) {
  const theme = useTheme();
  const glass = useLiquidGlass();
  const reduceMotion = useReducedMotion();
  // The icon pops 92% → 100% as it fills.
  const [pop] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!active || reduceMotion) return;
    pop.setValue(0.92);
    Animated.timing(pop, { toValue: 1, duration: 180, easing: EASE_OUT, ...NATIVE }).start();
  }, [active, reduceMotion, pop]);

  const iconScale = useMemo(() => (active ? Animated.multiply(pop, keepSize) : pop), [active, pop, keepSize]);
  // On glass the pale grey disappears into bright content behind the bar; the
  // scheme's secondary text colour stays readable on light and dark glass alike.
  const color = active ? theme.accent : glass ? theme.muted : INACTIVE;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={item.label}
      style={{ flex: 1, height: BAR }}
    >
      {/* The current tab keeps its icon through the shrink; everything else fades. */}
      <Animated.View
        style={[{ flex: 1, alignItems: 'center', paddingTop: ICON_TOP, gap: 3 }, active ? null : { opacity: fade }]}
      >
        <Animated.View style={{ transform: [{ scale: iconScale }] }}>
          <VectorIcon name={item.icon} size={ICON} color={color} filled={active} />
        </Animated.View>
        <Animated.View style={active ? { opacity: fade } : null}>
          <Text
            variant="labelSm"
            maxFontSizeMultiplier={1.3}
            // One line in the fixed-height bar: on a narrow phone it shrinks a little rather than wrap.
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            style={{
              color,
              fontWeight: undefined,
              fontFamily: active || glass ? fontFamily.body.semibold : undefined,
            }}
          >
            {item.label}
          </Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}
