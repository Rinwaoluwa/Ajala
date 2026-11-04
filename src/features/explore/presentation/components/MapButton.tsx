import { Host } from '@expo/ui';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { GlassSurface, NativeIcon, type NativeIconSource } from '@shared/components';
import { useLiquidGlass } from '@shared/hooks/useLiquidGlass';
import { useTheme } from '@shared/hooks/useTheme';

/**
 * A square control floating over the map (locate, layers, the bolt, the filter
 * beside the search): 44pt, 12pt corners. Liquid Glass where the phone has it,
 * otherwise the card colour with a soft shadow (`GlassSurface`).
 * `active` tints it teal with a white glyph. A press dips it to 94% — on glass
 * the system's own press response does that instead. `badge` puts a Marigold
 * dot at its corner (a filter is on).
 */

const SIZE = 44;

export type MapButtonProps = {
  icon: NativeIconSource;
  accessibilityLabel: string;
  onPress: () => void;
  active?: boolean;
  badge?: boolean;
  /** Always teal (the bolt), whether on or off. */
  tone?: 'card' | 'primary';
};

export function MapButton({
  icon,
  accessibilityLabel,
  onPress,
  active = false,
  badge = false,
  tone = 'card',
}: MapButtonProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const glass = useLiquidGlass();
  const pressed = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: reduceMotion ? [] : [{ scale: 1 - 0.06 * pressed.value }],
  }));
  const filled = active || tone === 'primary';
  // The bolt off is a lighter teal, so on and off differ by more than colour alone.
  // Glass cannot be made translucent with opacity, so its tint carries the lightness.
  const dim = tone === 'primary' && !active;
  const tint = filled ? (dim && glass ? `${theme.primaryFill}B3` : theme.primaryFill) : null;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => pressed.set(withTiming(1, { duration: 90 }))}
      onPressOut={() => pressed.set(withTiming(0, { duration: 160 }))}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active }}
      hitSlop={4}
    >
      <Animated.View style={style}>
        <GlassSurface
          fallbackColor={theme.card}
          tint={tint}
          interactive
          style={{
            width: SIZE,
            height: SIZE,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: dim && !glass ? 0.7 : 1,
          }}
        >
          <Host matchContents pointerEvents="none" ignoreSafeArea="all">
            <NativeIcon
              source={icon}
              size={18}
              color={filled ? theme.primaryFillForeground : theme.foreground}
            />
          </Host>
          {badge ? (
            <View
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: theme.accent,
              }}
            />
          ) : null}
        </GlassSurface>
      </Animated.View>
    </Pressable>
  );
}
