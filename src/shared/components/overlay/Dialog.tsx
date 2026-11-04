import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
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

/**
 * A card in the middle of the screen over a dimmed scrim — a notice to read or a
 * short form to fill ("Before you RSVP", "Report activity"). For a choice that
 * rises from the bottom, use `Sheet`.
 *
 * Motion: the scrim fades in over 200ms while the card fades and settles from
 * 96% to full size; closing reverses it in 160ms, then unmounts. Reduce Motion
 * keeps the fades and drops the scale.
 *
 * The card is at most 420pt wide with the screen gutter around it, scrolls when
 * its content is taller than the screen (large text), and rides above the
 * keyboard. Tapping the scrim or the system back gesture calls `onDismiss`.
 */

const OPEN_MS = 200;
const CLOSE_MS = 160;

export type DialogProps = {
  isPresented: boolean;
  onDismiss: () => void;
  /** Read out when the dialog opens. */
  accessibilityLabel: string;
  children: ReactNode;
};

export function Dialog({ isPresented, onDismiss, accessibilityLabel, children }: DialogProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(isPresented);
  const shown = useSharedValue(0);

  if (isPresented && !mounted) setMounted(true);
  const unmount = useCallback(() => setMounted(false), []);

  useEffect(() => {
    if (!mounted) return;
    if (isPresented) {
      shown.set(withTiming(1, { duration: OPEN_MS, easing: Easing.out(Easing.cubic) }));
    } else {
      shown.set(
        withTiming(0, { duration: CLOSE_MS, easing: Easing.in(Easing.quad) }, (finished) => {
          if (finished) scheduleOnRN(unmount);
        }),
      );
    }
  }, [isPresented, mounted, shown, unmount]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: shown.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: reduceMotion ? [] : [{ scale: 0.96 + 0.04 * shown.value }],
  }));

  if (!mounted) return null;

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={onDismiss}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.scrim }, scrimStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityLabel="Close" />
      </Animated.View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'center', paddingHorizontal: SCREEN_GUTTER }}
        pointerEvents="box-none"
      >
        <Animated.View
          accessibilityViewIsModal
          accessibilityLabel={accessibilityLabel}
          style={[
            {
              alignSelf: 'center',
              width: '100%',
              maxWidth: 420,
              maxHeight: height - insets.top - insets.bottom - 32,
              borderRadius: 20,
              backgroundColor: theme.surface,
              overflow: 'hidden',
            },
            cardStyle,
          ]}
        >
          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 20 }}
          >
            <View>{children}</View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
