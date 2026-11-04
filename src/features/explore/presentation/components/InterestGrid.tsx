import { useEffect } from 'react';
import { Pressable, Text as RNText, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@shared/components';
import { MAX_HEADING_SCALE } from '@shared/hooks/useFontScale';
import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER } from '@shared/theme';

import type { Interest } from '../../domain/entities/Explore';

/**
 * "Browse By Interest" (Explore sheet): each interest as a tinted rounded tile
 * with its emoji and its name under it. Tapping one narrows "Meetups Near You"
 * to it; tapping it again shows all. The chosen tile gets a teal ring (180ms).
 *
 * Laid out as rows of `flex: 1` cells — four at the designed width, three or two
 * when the screen is narrow or the text large — so a row can never wrap early.
 */

/** The design's pastel tiles, in turn. Pale in both schemes, as the dark frames keep them. */
const TINTS = ['#FDF0D5', '#E9E8FC', '#E2F4EE', '#FBE4E1', '#E1EEFB', '#F3E6FA'];
const TILE = 56;

export function columnsFor(contentWidth: number, fontScale: number): number {
  const w = contentWidth / Math.max(fontScale, 1);
  return w >= 320 ? 4 : w >= 230 ? 3 : 2;
}

export function InterestGrid({
  interests,
  selected,
  onSelect,
}: {
  interests: Interest[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { width, fontScale } = useWindowDimensions();
  const columns = columnsFor(width - SCREEN_GUTTER * 2, fontScale);
  const rows: Interest[][] = [];
  for (let i = 0; i < interests.length; i += columns) rows.push(interests.slice(i, i + columns));

  return (
    <View style={{ gap: 16 }} accessibilityRole="radiogroup">
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: 8 }}>
          {row.map((interest, c) => (
            <InterestCell
              key={interest.id}
              interest={interest}
              tint={TINTS[(r * columns + c) % TINTS.length]}
              selected={selected === interest.id}
              onPress={() => onSelect(selected === interest.id ? null : interest.id)}
            />
          ))}
          {Array.from({ length: columns - row.length }, (_, i) => (
            <View key={`gap-${i}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}

function InterestCell({
  interest,
  tint,
  selected,
  onPress,
}: {
  interest: Interest;
  tint: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const on = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    on.set(withTiming(selected ? 1 : 0, { duration: 180, easing: Easing.out(Easing.quad) }));
  }, [selected, on]);
  const ringStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(on.value, [0, 1], ['transparent', theme.primary]),
  }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={interest.name}
      style={{ flex: 1, alignItems: 'center' }}
    >
      <Animated.View style={[{ borderWidth: 2, borderRadius: 18, padding: 2 }, ringStyle]}>
        <View
          style={{
            width: TILE,
            height: TILE,
            borderRadius: 14,
            backgroundColor: tint,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <RNText maxFontSizeMultiplier={MAX_HEADING_SCALE} style={{ fontSize: 24 }}>
            {interest.emoji ?? interest.name.slice(0, 1).toUpperCase()}
          </RNText>
        </View>
      </Animated.View>
      <Text
        variant="bodyXs"
        numberOfLines={2}
        className="mt-4 text-center"
        style={selected ? { color: theme.primary } : undefined}
      >
        {interest.name}
      </Text>
    </Pressable>
  );
}
