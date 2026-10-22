import { Image } from 'expo-image';
import { useEffect } from 'react';
import { View, useColorScheme } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Button, Text } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { palette } from '@shared/theme';

import { homeCopy } from '../copy';

/**
 * The passport progress card at the top of the feed (Figma Home Feed, light and
 * dark): the level tag in mint, the gold badge, "7/10 Experiences" with a bar,
 * what the next level needs, and View / Close.
 *
 * A STATIC PLACEHOLDER: the backend has no levels yet (API map §12), so the
 * numbers are the design's, as agreed with product. Swap `homeCopy.level` for
 * real data when the endpoint lands.
 *
 * Motion: the bar fills from empty to its value over 700ms, a beat after the
 * card appears. Reduce Motion shows it filled.
 */
/**
 * The gold badge, as PNG: the design's `badge.svg` draws its glow with SVG
 * filters and masks, which the app's SVG renderer does not support.
 */
const BADGE = require('../../../../../assets/images/badges/level-badge.png') as number;

export function LevelCard({ onView, onClose }: { onView: () => void; onClose: () => void }) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const reduceMotion = useReducedMotion();
  const level = homeCopy.level;
  const fill = useSharedValue(reduceMotion ? level.progress : 0);

  useEffect(() => {
    if (reduceMotion) return;
    fill.value = withDelay(
      200,
      withTiming(level.progress, { duration: 700, easing: Easing.out(Easing.cubic) }),
    );
  }, [fill, reduceMotion, level.progress]);

  const barStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  return (
    <View
      style={{
        backgroundColor: theme.card,
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      }}
    >
      <View className="flex-row items-start justify-between">
        <View
          style={{
            backgroundColor: theme.selectedFill,
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 4,
          }}
        >
          <Text variant="labelSm" style={{ color: theme.selectedForeground }}>
            {level.tag}
          </Text>
        </View>
        <Image source={BADGE} style={{ width: 34, height: 44 }} contentFit="contain" accessible={false} />
      </View>

      <View className="mt-8 flex-row items-baseline justify-between">
        <Text variant="labelMd">{level.progressLabel}</Text>
        <Text variant="bodySm" tone="muted">{`${Math.round(level.progress * 100)}%`}</Text>
      </View>
      <View
        className="mt-8"
        style={{ height: 8, borderRadius: 4, backgroundColor: theme.surfaceMuted, overflow: 'hidden' }}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(level.progress * 100) }}
      >
        <Animated.View
          style={[{ height: 8, borderRadius: 4, backgroundColor: theme.primaryFill }, barStyle]}
        />
      </View>

      <View className="mt-12 flex-row items-center" style={{ gap: 8 }}>
        <Text variant="bodySm" tone="muted" style={{ flex: 1 }}>
          {level.next}
          <Text variant="bodySm" tone="accent">
            {level.nextLevel}
          </Text>
        </Text>
        <Button label={level.view} size="sm" onPress={onView} />
        {/* A grey pill on light, a white one on dark, as the frames draw it. */}
        <Button
          label={level.close}
          size="sm"
          tint={
            dark
              ? { fill: palette.white, label: palette.ink }
              : { fill: theme.surfaceMuted, label: theme.muted }
          }
          onPress={onClose}
        />
      </View>
    </View>
  );
}
