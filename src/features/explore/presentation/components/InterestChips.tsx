import { useEffect } from 'react';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { GlassSurface, JellyPress, ScrollRow } from '@shared/components';
import { MAX_TEXT_SCALE } from '@shared/hooks/useFontScale';
import { useLiquidGlass } from '@shared/hooks/useLiquidGlass';
import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER, palette, textStyles } from '@shared/theme';

import { exploreCopy } from '../copy';
import { useInterests } from '../hooks/useInterests';
import { useMe } from '../hooks/useMe';

/**
 * The pills over the map (Figma Explore): "All interests", then the person's
 * own interests (`GET /me`), one chosen at a time. With an interest chosen the
 * pins are the posts with it (`useMapPins`); "All interests" shows every pin.
 * Someone with no interests yet gets the server's list instead (`GET /interests`).
 *
 * The chosen pill fills Marigold with a white label, as drawn; the rest are
 * white pills with ink labels — or, where the phone has Liquid Glass, clear
 * glass with the chosen one tinted Marigold. The fill cross-fades in 180ms.
 * The row scrolls sideways once the pills outgrow the screen.
 */
export function InterestChips({
  value,
  onChange,
}: {
  /** The chosen interest's id; null is "All interests". */
  value: string | null;
  onChange: (interestId: string | null) => void;
}) {
  const me = useMe();
  const all = useInterests();
  const mine = me.data?.interests ?? [];
  const interests = mine.length ? mine : all.interests;

  return (
    <ScrollRow inset={SCREEN_GUTTER} accessibilityRole="radiogroup">
      <InterestChip label={exploreCopy.map.allInterests} selected={value === null} onPress={() => onChange(null)} />
      {interests.map((interest) => (
        <InterestChip
          key={interest.id}
          label={interest.name}
          selected={value === interest.id}
          onPress={() => onChange(value === interest.id ? null : interest.id)}
        />
      ))}
    </ScrollRow>
  );
}

function InterestChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  const glass = useLiquidGlass();
  const on = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    on.set(withTiming(selected ? 1 : 0, { duration: 180, easing: Easing.out(Easing.quad) }));
  }, [selected, on]);

  const pillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], [theme.card, theme.accent]),
  }));
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(on.value, [0, 1], [theme.foreground, palette.white]),
  }));

  const content = (
    <Animated.Text
      maxFontSizeMultiplier={MAX_TEXT_SCALE}
      numberOfLines={1}
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
  );

  return (
    // A jelly wobble on touch (`JellyPress`), as the home feed's pills.
    <JellyPress
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
    >
      {glass ? (
        <GlassSurface fallbackColor={theme.card} tint={selected ? theme.accent : null} interactive={false} style={PILL}>
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
    </JellyPress>
  );
}

const PILL = {
  flexDirection: 'row',
  alignItems: 'center',
  borderRadius: 999,
  paddingHorizontal: 16,
  paddingVertical: 9,
} as const;
