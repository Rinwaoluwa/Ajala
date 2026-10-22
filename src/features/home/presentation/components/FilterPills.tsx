import { useEffect } from 'react';
import { Pressable, ScrollView } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { MAX_TEXT_SCALE } from '@shared/hooks/useFontScale';
import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER, textStyles } from '@shared/theme';

import type { FeedFilter } from '../../domain/entities/Feed';
import { FEED_FILTERS } from '../../domain/rules/feedRules';

/**
 * The post-type pills under the header (Figma Home Feed): a row that scrolls
 * sideways, the chosen one filled teal with a white label, the rest pale with a
 * grey one. The fill cross-fades in 180ms. Before the feed has loaded, they are
 * drawn but inert, as the skeleton frame shows them.
 */

export function FilterPills({
  value,
  onChange,
  disabled = false,
}: {
  value: FeedFilter;
  onChange: (filter: FeedFilter) => void;
  disabled?: boolean;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, gap: 8 }}
      accessibilityRole="tablist"
    >
      {FEED_FILTERS.map((f) => (
        <Pill
          key={f.value}
          label={f.label}
          selected={f.value === value}
          disabled={disabled}
          onPress={() => onChange(f.value)}
        />
      ))}
    </ScrollView>
  );
}

function Pill({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const on = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    on.value = withTiming(selected ? 1 : 0, { duration: 180, easing: Easing.out(Easing.quad) });
  }, [selected, on]);

  const pillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], [theme.pillFill, theme.primaryFill]),
  }));
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(on.value, [0, 1], [theme.pillForeground, theme.primaryFillForeground]),
  }));

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || selected}
      accessibilityRole="tab"
      accessibilityState={{ selected, disabled }}
    >
      <Animated.View style={[{ borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10 }, pillStyle]}>
        <Animated.Text
          maxFontSizeMultiplier={MAX_TEXT_SCALE}
          style={[
            {
              fontFamily: textStyles.bodyMd.fontFamily,
              fontSize: textStyles.bodyMd.fontSize,
              lineHeight: textStyles.bodyMd.lineHeight,
            },
            labelStyle,
          ]}
        >
          {label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}
