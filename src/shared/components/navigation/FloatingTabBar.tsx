import { useEffect } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@shared/hooks/useTheme';
import { palette } from '@shared/theme';

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
 * Motion: switching tabs cross-fades outline to fill (160ms) and pops the icon
 * 92% → 100% over 180ms. The "+" dips on press. Reduce Motion drops both scales.
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
const BAR = 72;
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
  const halfWidth = (width - SIDE * 2 - GAP) / 2;
  const press = useSharedValue(0);

  const fabStyle = useAnimatedStyle(() => ({
    transform: reduceMotion ? [] : [{ scale: 1 - 0.06 * press.value }],
  }));

  const half = (items: [TabItem, TabItem], side: 'left' | 'right') => (
    <View
      style={{
        width: halfWidth,
        height: BAR,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.tabBar,
        borderRadius: BAR / 2,
        // Room under the "+" that overhangs each half's inner end.
        paddingLeft: side === 'right' ? FAB / 2 - GAP : 0,
        paddingRight: side === 'left' ? FAB / 2 - GAP : 0,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
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
    </View>
  );

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
        <Pressable
          onPress={onCreate}
          onPressIn={() => press.set(withTiming(1, { duration: 90 }))}
          onPressOut={() => press.set(withTiming(0, { duration: 160 }))}
          accessibilityRole="button"
          accessibilityLabel={createLabel}
          style={{
            width: FAB,
            height: FAB,
            borderRadius: FAB / 2,
            backgroundColor: theme.primaryFill,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: palette.tealDark,
            shadowOpacity: 0.3,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 8,
          }}
        >
          <SvgIcon name="plus" size={26} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

function TabButton({ item, active, onPress }: { item: TabItem; active: boolean; onPress: () => void }) {
  const theme = useTheme();
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
  const color = active ? theme.accent : INACTIVE;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={item.label}
      style={{ flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 4 }}
    >
      <Animated.View style={iconStyle}>
        <VectorIcon name={item.icon} size={24} color={color} filled={active} />
      </Animated.View>
      <Text variant="labelSm" maxFontSizeMultiplier={1.3} style={{ color, fontWeight: undefined }}>
        {item.label}
      </Text>
    </Pressable>
  );
}
