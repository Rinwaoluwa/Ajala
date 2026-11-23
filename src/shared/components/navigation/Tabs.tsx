import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@shared/hooks/useTheme';
import { useAppColorScheme } from '@shared/hooks/useAppColorScheme';
import { palette } from '@shared/theme';

import { Text } from '../ui/Text';
import { haptics } from '@shared/feedback/haptics';

/**
 * Two kinds of one-of switch between views of a screen:
 *
 *   - `UnderlineTabs` — labels across the width with a line under the chosen one
 *     (a profile's Hosting / Attending). With `hug`, each label keeps its own
 *     width and they sit together at the start, the line as wide as the chosen
 *     label (the own profile's My posts / Saved); labels that don't fit scroll
 *     sideways, so they never wrap or shrink.
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
  hug = false,
}: {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Labels keep their own width, together at the start, instead of sharing the width. */
  hug?: boolean;
}) {
  return hug ? (
    <HuggingTabs options={options} value={value} onChange={onChange} />
  ) : (
    <SpreadTabs options={options} value={value} onChange={onChange} />
  );
}

/** The gap between hugging labels. */
const HUG_GAP = 24;

function HuggingTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  // Where each label sits in the row, as measured: the line goes under the chosen one.
  const [frames, setFrames] = useState<Record<string, { x: number; width: number }>>({});
  const chosen = frames[value];
  const chosenX = chosen ? chosen.x : null;
  const chosenWidth = chosen ? chosen.width : null;
  const x = useSharedValue(0);
  const width = useSharedValue(0);
  // The line is put under the first choice; it slides only to later ones.
  const placed = useRef(false);
  useEffect(() => {
    if (chosenX === null || chosenWidth === null) return;
    const timing = {
      duration: reduceMotion || !placed.current ? 0 : 220,
      easing: Easing.out(Easing.cubic),
    };
    placed.current = true;
    x.set(withTiming(chosenX, timing));
    width.set(withTiming(chosenWidth, timing));
  }, [chosenX, chosenWidth, reduceMotion, x, width]);
  const line = useAnimatedStyle(() => ({ width: width.value, transform: [{ translateX: x.value }] }));

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist">
      <View style={{ flexDirection: 'row', gap: HUG_GAP }}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              onLayout={(e: LayoutChangeEvent) => {
                const { x: at, width: wide } = e.nativeEvent.layout;
                setFrames((now) =>
                  now[o.value]?.x === at && now[o.value]?.width === wide
                    ? now
                    : { ...now, [o.value]: { x: at, width: wide } },
                );
              }}
              onPress={() => {
                if (o.value !== value) haptics.select();
                onChange(o.value);
              }}
              hitSlop={{ top: 4, bottom: 4, left: HUG_GAP / 2, right: HUG_GAP / 2 }}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={{ paddingTop: 8, paddingBottom: 10 }}
            >
              <Text variant="labelMd" tone={selected ? 'default' : 'muted'}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', bottom: 0, left: 0, height: 2, borderRadius: 1, backgroundColor: theme.foreground },
            line,
          ]}
        />
      </View>
    </ScrollView>
  );
}

function SpreadTabs<T extends string>({
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
              onPress={() => {
                if (o.value !== value) haptics.select();
                onChange(o.value);
              }}
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
  const dark = useAppColorScheme() === 'dark';
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
              onPress={() => {
                if (o.value !== value) haptics.select();
                onChange(o.value);
              }}
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
