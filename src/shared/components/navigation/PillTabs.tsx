import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { MAX_TEXT_SCALE } from '@shared/hooks/useFontScale';
import { useLiquidGlass } from '@shared/hooks/useLiquidGlass';
import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER, palette, textStyles } from '@shared/theme';

import { ScrollRow } from '../layout/ScrollRow';
import { GlassSurface } from '../surface/GlassSurface';
import { JellyPress } from '../surface/JellyPress';

/**
 * One-of-several pills in a row that scrolls sideways: the home feed's
 * All / Meetups / Events / Plans / Groups, Trips' Upcoming / Requests / Past, the
 * filters on Saved, Drafts, Notifications and Achievements.
 *
 * Liquid Glass where the phone has it (`GlassSurface`, `onPlainPage`), styled
 * like Explore's type chips: each pill is frosted glass on a card-coloured pill
 * with a small shadow of its own, the chosen one tinted brand teal with a white
 * label. Elsewhere the design's solid pills — teal chosen, pale the rest, or outlined
 * (`look="outline"`, the Trips and Drafts frames).
 *
 * Motion: the solid fill and the label cross-fade in 180ms; on glass the tint
 * changes with the system's own transition. Labels grow with the text size; the
 * row scrolls sideways only once it no longer fits (`ScrollRow`).
 */

/**
 * A pill's own colours, for rows where each choice is told apart by colour (the
 * home feed's post types): `fill` and `label` when chosen, `soft` and
 * `softLabel` otherwise.
 */
export type PillColor = { fill: string; label: string; soft: string; softLabel: string };

export type PillTabOption<T extends string> = { value: T; label: string; color?: PillColor };

export type PillTabsProps<T extends string> = {
  options: readonly PillTabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  /** Solid look without glass: filled pale pills (default) or white pills with a hairline. */
  look?: 'filled' | 'outline';
  /** Side padding of the row; the screen gutter by default. */
  inset?: number;
  /** A jelly wobble on touch (`JellyPress`), on by default as on every pill in the app. */
  jelly?: boolean;
  /**
   * Every pill in view, wrapping onto more lines, instead of one row that
   * scrolls sideways: for a sheet's choices (Explore's filters), where a pill
   * hidden off the edge would not be found.
   */
  wrap?: boolean;
  /** `radio` for a form's one-of choice; `tab` (default) for a row that switches what is shown. */
  role?: 'tab' | 'radio';
};

export function PillTabs<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
  look = 'filled',
  inset = SCREEN_GUTTER,
  jelly = true,
  wrap = false,
  role = 'tab',
}: PillTabsProps<T>) {
  const pills = options.map((o) => (
    <Pill
      key={o.value}
      label={o.label}
      selected={o.value === value}
      disabled={disabled}
      look={look}
      color={o.color}
      jelly={jelly}
      role={role}
      onPress={() => onChange(o.value)}
    />
  ));
  if (wrap) {
    return (
      <View
        accessibilityRole={role === 'radio' ? 'radiogroup' : 'tablist'}
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
      >
        {pills}
      </View>
    );
  }
  return (
    <ScrollRow inset={inset} accessibilityRole="tablist">
      {pills}
    </ScrollRow>
  );
}

function Pill({
  label,
  selected,
  disabled,
  look,
  color,
  jelly,
  role,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  look: 'filled' | 'outline';
  color?: PillColor;
  jelly: boolean;
  role: 'tab' | 'radio';
  onPress: () => void;
}) {
  const theme = useTheme();
  const glass = useLiquidGlass();
  const on = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    on.set(withTiming(selected ? 1 : 0, { duration: 180, easing: Easing.out(Easing.quad) }));
  }, [selected, on]);

  const rest = color?.soft ?? (look === 'outline' ? theme.card : theme.pillFill);
  const restLabel = color?.softLabel ?? (glass ? theme.foreground : theme.pillForeground);
  const chosen = color?.fill ?? theme.primaryFill;
  const chosenLabel = color?.label ?? palette.white;
  const pillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], [rest, chosen]),
  }));
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(on.value, [0, 1], [restLabel, chosenLabel]),
  }));

  const text = (
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
  );

  const box = { borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10 } as const;

  // The chosen pill takes no presses, so it doesn't wobble either.
  const Press = jelly ? JellyPress : Pressable;
  return (
    <Press
      onPress={onPress}
      disabled={disabled || selected}
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={role === 'radio' ? { checked: selected, disabled } : { selected, disabled }}
    >
      {glass ? (
        <GlassSurface
          fallbackColor={rest}
          tint={selected ? chosen : (color?.soft ?? null)}
          interactive={false}
          shadow={false}
          onPlainPage
          style={box}
        >
          {text}
        </GlassSurface>
      ) : (
        <Animated.View
          style={[
            box,
            look === 'outline'
              ? { borderWidth: 1, borderColor: selected ? 'transparent' : theme.border }
              : null,
            pillStyle,
          ]}
        >
          {text}
        </Animated.View>
      )}
    </Press>
  );
}

