import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { LoadingRing, Screen, Text } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

import { useOtaDownloadProgress } from '@core/updates/otaUpdates';

import { otaUpdateCopy as copy } from '../copy';
import type { OtaPhase } from '../hooks/useOtaUpdate';

/**
 * "Updating Ajala" — covers the app while an over-the-air update downloads, then
 * says it is restarting. Nothing to tap: it ends by itself, in the update or,
 * if the download fails, back in the app.
 *
 * NOT IN FIGMA. Laid out like the forced-update screen (heading block near the
 * top), with a progress bar that fills as the update arrives and a ring once
 * it restarts.
 *
 * Larger text: the screen scrolls when the text outgrows it. Motion: it fades
 * in over 240 ms, and the bar eases to each new value; with Reduce Motion on,
 * the bar jumps instead.
 */

const FADE_MS = 240;
const BAR_HEIGHT = 6;
const TOP_OFFSET = 40;

export function UpdatingScreen({ phase }: { phase: Exclude<OtaPhase, 'idle'> }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const progress = useOtaDownloadProgress();
  const restarting = phase === 'restarting';
  const fraction = restarting ? 1 : Math.min(Math.max(progress ?? 0, 0), 1);
  const percent = progress === undefined ? null : Math.round(fraction * 100);

  const shown = useSharedValue(0);
  const fill = useSharedValue(0);

  useEffect(() => {
    shown.set(withTiming(1, { duration: FADE_MS, easing: Easing.out(Easing.cubic) }));
  }, [shown]);

  useEffect(() => {
    fill.set(reduceMotion ? fraction : withTiming(fraction, { duration: 300, easing: Easing.out(Easing.cubic) }));
  }, [fill, fraction, reduceMotion]);

  const fade = useAnimatedStyle(() => ({ opacity: shown.get() }));
  const bar = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, fade]} accessibilityViewIsModal>
      <Screen scroll>
        <View style={{ paddingTop: TOP_OFFSET, gap: 8 }}>
          <Text variant="headingXxl" tone="heading" accessibilityRole="header">
            {copy.title}
          </Text>
          <Text variant="bodyMd">{copy.body}</Text>
        </View>

        <View
          style={{ marginTop: 32, gap: 12 }}
          accessibilityRole="progressbar"
          accessibilityLabel={restarting ? copy.restarting : copy.downloading(percent)}
          accessibilityValue={percent === null ? undefined : { min: 0, max: 100, now: percent }}
          accessibilityLiveRegion="polite"
        >
          <View
            style={{
              height: BAR_HEIGHT,
              borderRadius: BAR_HEIGHT / 2,
              backgroundColor: theme.track,
              overflow: 'hidden',
            }}
          >
            <Animated.View
              style={[{ height: BAR_HEIGHT, borderRadius: BAR_HEIGHT / 2, backgroundColor: theme.primary }, bar]}
            />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {restarting ? <LoadingRing size={18} accessibilityLabel={copy.restarting} /> : null}
            <Text variant="bodySm" tone="muted" style={{ flexShrink: 1 }}>
              {restarting ? copy.restarting : copy.downloading(percent)}
            </Text>
          </View>
        </View>
      </Screen>
    </Animated.View>
  );
}
