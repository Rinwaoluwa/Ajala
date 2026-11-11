import { Children, isValidElement, memo, useEffect, type ReactNode } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { MAX_TEXT_SCALE } from '@shared/hooks/useFontScale';
import { useTheme } from '@shared/hooks/useTheme';
import { palette, textStyles } from '@shared/theme';

import { PillRows } from '../layout/PillRows';
import { JellyPress } from '../surface/JellyPress';

/**
 * A choice in a multi-select list: the pill on the profile-setup screens
 * (languages, travel styles, destinations, interests).
 *
 * Unselected, it is the pale pill with ink text in both schemes. Selected, it
 * fills with one of the brand colours — the design scatters teal, Marigold and
 * coral across a list, so the caller picks the `tone` (keep it stable per option,
 * so a chip does not change colour when its neighbours do). Marigold takes its
 * ink label: white on it is about 1.8:1, as on the status sheets — flagged to design.
 *
 * `leading` sits before the label (an interest's emoji). A chip with it is the
 * taller interests pill.
 *
 * Motion: the fill cross-fades in 180ms, and a press dips the pill to 96% and
 * back. Reduce Motion keeps the fade and drops the dip. The pill grows with the
 * text-size setting: its height is padding around the label, never fixed.
 */

export type ChipTone = 'teal' | 'marigold' | 'coral';

export type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  tone?: ChipTone;
  /** Drawn before the label, e.g. an emoji badge. */
  leading?: ReactNode;
  /** Unselectable — the list is full. A selected chip is never disabled. */
  disabled?: boolean;
  /** `radio` for a one-of list (gender); `checkbox` (default) for pick-several. */
  role?: 'checkbox' | 'radio';
  testID?: string;
};

const FADE_MS = 180;
const PRESSED_SCALE = 0.96;

function ChipComponent({
  label,
  selected,
  onPress,
  tone = 'teal',
  leading,
  disabled = false,
  role = 'checkbox',
  testID,
}: ChipProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  // Measured afresh when the text-size setting changes, as `Text` is.
  const { fontScale } = useWindowDimensions();
  const on = useSharedValue(selected ? 1 : 0);
  const pressed = useSharedValue(0);

  useEffect(() => {
    on.value = withTiming(selected ? 1 : 0, {
      duration: FADE_MS,
      easing: Easing.out(Easing.quad),
    });
  }, [selected, on]);

  const fills: Record<ChipTone, { fill: string; label: string }> = {
    teal: { fill: theme.primaryFill, label: theme.primaryFillForeground },
    marigold: { fill: theme.accent, label: theme.accentForeground },
    coral: { fill: palette.coral, label: palette.white },
  };
  const target = fills[tone];
  const restFill = theme.chipFill;
  const restLabel = theme.chipForeground;

  const pillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], [restFill, target.fill]),
    transform: reduceMotion ? [] : [{ scale: 1 - (1 - PRESSED_SCALE) * pressed.value }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(on.value, [0, 1], [restLabel, target.label]),
  }));

  const inactive = disabled && !selected;

  return (
    // A jelly wobble on touch (`JellyPress`), as every pill in the app.
    <JellyPress
      onPress={onPress}
      disabled={inactive}
      onPressIn={() => pressed.set(withTiming(1, { duration: 90 }))}
      onPressOut={() => pressed.set(withTiming(0, { duration: 160 }))}
      accessibilityRole={role}
      accessibilityState={{ checked: selected, disabled: inactive }}
      accessibilityLabel={label}
      testID={testID}
    >
      <Animated.View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: leading ? 6 : 8,
            borderRadius: 999,
            paddingVertical: leading ? 8 : 6,
            paddingLeft: leading ? 6 : 12,
            paddingRight: 12,
            opacity: inactive ? 0.5 : 1,
          },
          pillStyle,
        ]}
      >
        {leading ? <View importantForAccessibility="no-hide-descendants">{leading}</View> : null}
        {/* Animated.Text, not `Text`: the label's colour is animated with the fill. */}
        <Animated.Text
          key={fontScale}
          maxFontSizeMultiplier={MAX_TEXT_SCALE}
          style={[
            {
              fontFamily: textStyles.bodySm.fontFamily,
              fontSize: textStyles.bodySm.fontSize,
              lineHeight: textStyles.bodySm.lineHeight,
            },
            labelStyle,
          ]}
        >
          {label}
        </Animated.Text>
      </Animated.View>
    </JellyPress>
  );
}

/** Memoised: a list of forty re-renders only the chip that changed. */
export const Chip = memo(ChipComponent);

export type ChipGroupProps = {
  children: ReactNode;
  /** Space between chips in a row, and between rows. */
  gap?: number;
  rowGap?: number;
  /** Rows used once the chips no longer fit on one line (`PillRows`). */
  maxRows?: number;
};

/**
 * Chips on one line while they fit; otherwise in three rows that scroll
 * sideways together (`PillRows`), so a long list (36 travel styles, every
 * language) never takes over the page.
 */
export function ChipGroup({ children, gap = 6, rowGap = 8, maxRows = 3 }: ChipGroupProps) {
  const pills = Children.toArray(children).filter(isValidElement);
  return <PillRows pills={pills} maxRows={maxRows} gap={gap} rowGap={rowGap} />;
}
