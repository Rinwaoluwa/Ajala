import { useEffect } from 'react';
import { Platform, Pressable, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKeyboardShown } from '@shared/hooks/useKeyboardShown';
import { useLiquidGlass } from '@shared/hooks/useLiquidGlass';
import { useTheme } from '@shared/hooks/useTheme';
import { fontFamily, palette } from '@shared/theme';

import { GlassSurface } from '../surface/GlassSurface';
import { SvgIcon } from '../ui/SvgIcon';
import { VectorIcon, type VectorIconName } from '../ui/VectorIcon';
import { Text } from '../ui/Text';

/**
 * The app's tab bar (Figma Home Feed): it floats over the content, split into
 * two rounded halves around a raised teal "+" — Home and Explore on the left,
 * Trips and Profile on the right.
 *
 * The current tab's icon is FILLED in Marigold with a Marigold label; the
 * others are grey outlines (`VectorIcon`). The house fills in its own two tones.
 *
 * Liquid Glass where the phone has it (`GlassSurface`): both halves are glass
 * over whatever scrolls beneath, and the "+" is glass tinted brand teal, all
 * answering touches the system way. Elsewhere they are the design's solid white
 * (Deep on dark) and teal.
 *
 * Motion: switching tabs cross-fades outline to fill (160ms) and pops the icon
 * 92% → 100% over 180ms. The "+" dips on press — on glass, the system's own
 * press response does that instead. Reduce Motion drops both scales.
 *
 * It sizes from the window: the halves leave room for the "+" between them, and
 * labels grow with the text size up to 1.3×, beyond which they would collide.
 */

export type TabItem = { key: string; label: string; icon: VectorIconName };

export type FloatingTabBarProps = {
  left: [TabItem, TabItem];
  right: [TabItem, TabItem];
  current: string;
  onSelect: (key: string) => void;
  onCreate: () => void;
  createLabel: string;
};

const FAB = 64;
/** Tall enough that the labels keep clear of the bar's lower edge (the glass capsule curves in there). */
const BAR = 76;
const GAP = 8;
const SIDE = 20;
const INACTIVE = '#A4ACB9';

export function FloatingTabBar({
  left,
  right,
  current,
  onSelect,
  onCreate,
  createLabel,
}: FloatingTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const glass = useLiquidGlass();
  const halfWidth = (width - SIDE * 2 - GAP) / 2;
  const press = useSharedValue(0);

  const fabStyle = useAnimatedStyle(() => ({
    transform: reduceMotion ? [] : [{ scale: 1 - 0.06 * press.value }],
  }));
  // On Android the app shrinks above the keyboard (app/_layout.tsx), which would
  // lift the bar onto the keyboard over the text box. It steps aside while typing.
  const keyboardShown = useKeyboardShown();

  const half = (items: [TabItem, TabItem], side: 'left' | 'right') => (
    <GlassSurface
      fallbackColor={theme.tabBar}
      variant="regular"
      interactive
      shadow={false}
      style={{
        width: halfWidth,
        height: BAR,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: BAR / 2,
        // Room under the "+" that overhangs each half's inner end.
        paddingLeft: side === 'right' ? FAB / 2 - GAP : 0,
        paddingRight: side === 'left' ? FAB / 2 - GAP : 0,
        ...(glass
          ? null
          : {
              shadowColor: '#000',
              shadowOpacity: 0.08,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }),
      }}
    >
      {items.map((item) => (
        <TabButton
          key={item.key}
          item={item}
          active={item.key === current}
          onPress={() => onSelect(item.key)}
        />
      ))}
    </GlassSurface>
  );

  if (Platform.OS === 'android' && keyboardShown) return null;

  return (
    <View
      pointerEvents="box-none"
      accessibilityRole="tablist"
      style={{
        position: 'absolute',
        left: SIDE,
        right: SIDE,
        bottom: Math.max(insets.bottom - 10, 8),
        height: BAR + 16,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
      }}
    >
      {half(left, 'left')}
      {half(right, 'right')}
      <Animated.View
        style={[{ position: 'absolute', left: (width - SIDE * 2) / 2 - FAB / 2, top: 0 }, fabStyle]}
      >
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
            onPress={onCreate}
            onPressIn={() => press.set(withTiming(1, { duration: 90 }))}
            onPressOut={() => press.set(withTiming(0, { duration: 160 }))}
            accessibilityRole="button"
            accessibilityLabel={createLabel}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <SvgIcon name="plus" size={26} />
          </Pressable>
        </GlassSurface>
      </Animated.View>
    </View>
  );
}

function TabButton({ item, active, onPress }: { item: TabItem; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  const glass = useLiquidGlass();
  const reduceMotion = useReducedMotion();
  const pop = useSharedValue(1);

  useEffect(() => {
    if (!active || reduceMotion) return;
    pop.value = withSequence(
      withTiming(0.92, { duration: 0 }),
      withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) }),
    );
  }, [active, reduceMotion, pop]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  // On glass the pale grey disappears into bright content behind the bar; the
  // scheme's secondary text colour stays readable on light and dark glass alike.
  const color = active ? theme.accent : glass ? theme.muted : INACTIVE;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={item.label}
      // The label sits a little above centre: the capsule's rounded lower edge would otherwise crowd it.
      style={{
        flex: 1,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingBottom: 6,
      }}
    >
      <Animated.View style={iconStyle}>
        <VectorIcon name={item.icon} size={24} color={color} filled={active} />
      </Animated.View>
      <Text
        variant="labelSm"
        maxFontSizeMultiplier={1.3}
        // One line in the fixed-height bar: on a narrow phone it shrinks a little rather than wrap.
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        style={{ color, fontWeight: undefined, fontFamily: glass ? fontFamily.body.semibold : undefined }}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}
