import { Host } from '@expo/ui';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER } from '@shared/theme';

import { NativeIcon } from '../ui/NativeIcon';
import { Text } from '../ui/Text';
import { icons } from '../ui/icons';

/**
 * A bottom sheet with a title and a close button (Figma "Create something"):
 * drag handle, heading, a round × at the right, then the caller's content.
 *
 * React Native rather than Expo UI's BottomSheet, because its content is React
 * Native (SVG art, pressable cards). It opens in a transparent `Modal`, so it
 * covers the tab bar and the status bar too.
 *
 * Motion: the scrim fades in over 220ms while the sheet rises over 300ms
 * (ease-out); closing reverses it in 200ms, and only then unmounts. Reduce
 * Motion fades the sheet in place. Tapping the scrim, the ×, or the system back
 * gesture closes it.
 */

const RISE_MS = 300;
const FALL_MS = 200;

export type SheetProps = {
  isPresented: boolean;
  title: string;
  onDismiss: () => void;
  children: ReactNode;
};

export function Sheet({ isPresented, title, onDismiss, children }: SheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  // Stays mounted through the closing animation.
  const [mounted, setMounted] = useState(isPresented);
  const [height, setHeight] = useState(0);
  const shown = useSharedValue(0);

  if (isPresented && !mounted) setMounted(true);

  const unmount = useCallback(() => setMounted(false), []);

  useEffect(() => {
    if (!mounted || height === 0) return;
    if (isPresented) {
      shown.value = withTiming(1, { duration: RISE_MS, easing: Easing.out(Easing.cubic) });
    } else {
      shown.value = withTiming(0, { duration: FALL_MS, easing: Easing.in(Easing.quad) }, (finished) => {
        if (finished) scheduleOnRN(unmount);
      });
    }
  }, [isPresented, mounted, height, shown, unmount]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: shown.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? shown.value : 1,
    transform: [{ translateY: reduceMotion ? 0 : (1 - shown.value) * height }],
  }));

  if (!mounted) return null;

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={onDismiss}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.scrim }, scrimStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View
        onLayout={(e: LayoutChangeEvent) => setHeight(e.nativeEvent.layout.height)}
        accessibilityViewIsModal
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            opacity: height === 0 ? 0 : 1,
            backgroundColor: theme.surface,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: SCREEN_GUTTER,
            paddingTop: 10,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
          },
          sheetStyle,
        ]}
      >
        <View
          style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: theme.track }}
        />
        <View className="mt-16 flex-row items-center justify-between">
          <Text variant="headingMd" accessibilityRole="header">
            {title}
          </Text>
          <Pressable
            onPress={onDismiss}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: theme.surfaceMuted,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Host matchContents pointerEvents="none">
              <NativeIcon source={icons.close} size={12} color={theme.foreground} />
            </Host>
          </Pressable>
        </View>
        <View className="mt-16">{children}</View>
      </Animated.View>
    </Modal>
  );
}
