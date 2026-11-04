import { useEffect, useState } from 'react';
import { Pressable, View, useColorScheme, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@shared/hooks/useTheme';
import { palette } from '@shared/theme';

import { Text } from '../ui/Text';

/**
 * Two kinds of one-of switch between views of a screen:
 *
 *   - `UnderlineTabs` — labels across the width with a line under the chosen one
 *     (a profile's Hosting / Attending, Going / Requested).
 *   - `SegmentedControl` — a pale track with the chosen half filled (Achievements'
 *     Badges / Stamps): teal on light, Marigold with ink on dark, as drawn.
 *
 * Both slide their marker to the new choice (220ms ease-out; instant under
 * Reduce Motion). Segments share the width equally, measured, so they never
 * wrap; labels grow with the text size.
 */

type Option<T extends string> = { value: T; label: string };

function useSlider(index: number, count: number) {
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  const segment = count > 0 ? width / count : 0;
  useEffect(() => {
    x.set(
      withTiming(index * segment, { duration: reduceMotion ? 0 : 220, easing: Easing.out(Easing.cubic) }),
    );
  }, [index, segment, reduceMotion, x]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return { segment, style, onLayout: (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width) };
}

export function UnderlineTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const theme = useTheme();
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const slider = useSlider(index, options.length);
  return (
    <View
      onLayout={slider.onLayout}
      accessibilityRole="tablist"
      style={{ borderBottomWidth: 1, borderBottomColor: theme.border }}
    >
      <View style={{ flexDirection: 'row' }}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={{ flex: 1, alignItems: 'center', paddingVertical: 12 }}
            >
              <Text variant="labelMd" tone={selected ? 'default' : 'muted'}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: -1,
            left: 0,
            height: 2,
            width: slider.segment,
            backgroundColor: theme.foreground,
          },
          slider.style,
        ]}
      />
    </View>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const inner = useSlider(index, options.length);
  const fill = dark ? theme.accent : theme.primaryFill;
  const chosenInk = dark ? palette.ink : palette.white;
  return (
    <View
      accessibilityRole="tablist"
      style={{
        borderRadius: 14,
        padding: 4,
        backgroundColor: theme.surfaceMuted,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <View onLayout={inner.onLayout} style={{ flexDirection: 'row' }}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: inner.segment,
              borderRadius: 10,
              backgroundColor: fill,
            },
            inner.style,
          ]}
        />
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={{ flex: 1, alignItems: 'center', paddingVertical: 9 }}
            >
              <Text variant="labelMd" style={{ color: selected ? chosenInk : theme.muted }}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
