import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { GlassSurface, ScrollRow } from '@shared/components';
import { MAX_TEXT_SCALE } from '@shared/hooks/useFontScale';
import { useLiquidGlass } from '@shared/hooks/useLiquidGlass';
import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER, textStyles } from '@shared/theme';

import type { PostType } from '../../domain/entities/Explore';
import { PIN_TYPES } from '../../domain/rules/exploreRules';
import { typeEmoji } from '../copy';
import { typeColors } from '../typeColors';

/**
 * Meetup / Event / Plan / Group over the map (dark Explore frame): one at a time,
 * the pins follow (`type` on `GET /map/pins`). Tapping the chosen one again shows
 * all types. Chosen, a chip fills in its type's colour; the rest are white pills
 * — or, where the phone has Liquid Glass, clear glass, with the chosen one tinted
 * its type's colour. The fill and label cross-fade in 180ms. The row scrolls
 * sideways when the text is large.
 */
export function TypeChips({
  value,
  onChange,
}: {
  value: PostType | null;
  onChange: (t: PostType | null) => void;
}) {
  return (
    <ScrollRow inset={SCREEN_GUTTER} accessibilityRole="radiogroup">
      {PIN_TYPES.map((t) => (
        <TypeChip
          key={t.type}
          type={t.type}
          label={t.label}
          selected={value === t.type}
          onPress={() => onChange(value === t.type ? null : t.type)}
        />
      ))}
    </ScrollRow>
  );
}

function TypeChip({
  type,
  label,
  selected,
  onPress,
}: {
  type: PostType;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const glass = useLiquidGlass();
  const colour = typeColors(theme)[type];
  const on = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    on.set(withTiming(selected ? 1 : 0, { duration: 180, easing: Easing.out(Easing.quad) }));
  }, [selected, on]);

  const pillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], [theme.card, colour.fill]),
  }));
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(on.value, [0, 1], [theme.foreground, colour.label]),
  }));

  const content = (
    <>
      <Animated.Text maxFontSizeMultiplier={MAX_TEXT_SCALE} style={{ fontSize: 13 }}>
        {typeEmoji[type]}
      </Animated.Text>
      <Animated.Text
        maxFontSizeMultiplier={MAX_TEXT_SCALE}
        style={[
          {
            fontFamily: textStyles.labelSm.fontFamily,
            fontSize: textStyles.labelSm.fontSize,
            lineHeight: textStyles.labelSm.lineHeight,
          },
          labelStyle,
        ]}
      >
        {label}
      </Animated.Text>
    </>
  );

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
    >
      {glass ? (
        <GlassSurface
          fallbackColor={theme.card}
          tint={selected ? colour.fill : null}
          interactive={false}
          style={PILL}
        >
          {content}
        </GlassSurface>
      ) : (
        <Animated.View
          style={[
            PILL,
            {
              shadowColor: '#000',
              shadowOpacity: 0.1,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 2,
            },
            pillStyle,
          ]}
        >
          {content}
        </Animated.View>
      )}
    </Pressable>
  );
}

const PILL = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  borderRadius: 999,
  paddingHorizontal: 14,
  paddingVertical: 8,
} as const;
