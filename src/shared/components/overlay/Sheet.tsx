import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
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

import { NativeIcon } from '../ui/NativeIcon';
import { Text } from '../ui/Text';
import { icons } from '../ui/icons';
import { Host } from '../ui/Host';

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
 *
 * It never grows past the top safe area: at a large text size, content taller
 * than the room left scrolls inside the sheet (and only then), so the handle,
 * the title and the × stay on screen.
 *
 * The keyboard: on iOS the sheet rises with it, in the keyboard's own time, so
 * a field in it and the buttons under that field stay above the keys; if that
 * leaves too little room, the content scrolls to its end, where a sheet's field
 * and its Apply usually are. Android resizes a modal's window for the keyboard
 * itself, which lifts the sheet the same way.
 */

const RISE_MS = 300;
const FALL_MS = 200;

export type SheetProps = {
  isPresented: boolean;
  /** Left out, the sheet has only its drag handle: the content carries its own heading. */
  title?: string;
  /**
   * A line under the title. It sits above the scroll area rather than in it: pulled
   * up into the scroll area with a negative margin, Android clipped its top.
   */
  subtitle?: string;
  onDismiss: () => void;
  children: ReactNode;
  /**
   * Drawn over everything in the sheet's window, the whole screen, taking no
   * touches: a celebration that spills past the sheet (`SuccessSheet`'s confetti).
   */
  overlay?: ReactNode;
};

export function Sheet({ isPresented, title, subtitle, onDismiss, children, overlay }: SheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  // Stays mounted through the closing animation.
  const [mounted, setMounted] = useState(isPresented);
  const [height, setHeight] = useState(0);
  const window = useWindowDimensions();
  const [contentOverflows, setContentOverflows] = useState(false);
  // The scroll area's height and its content's; it scrolls only when the content is taller.
  const sizes = useRef({ viewport: 0, content: 0 });
  const measure = (part: 'viewport' | 'content', value: number) => {
    sizes.current[part] = value;
    const { viewport, content } = sizes.current;
    setContentOverflows(viewport > 0 && content > viewport + 1);
  };
  const shown = useSharedValue(0);
  // How far the keyboard pushes the sheet up (iOS), less the home-indicator room it covers.
  const lift = useSharedValue(0);
  const [keyboardRoom, setKeyboardRoom] = useState(0);
  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    if (!mounted || Platform.OS !== 'ios') return;
    const move = (to: number, duration: number) => {
      setKeyboardRoom(to);
      lift.value = withTiming(to, { duration: duration || 250, easing: Easing.out(Easing.cubic) });
    };
    const show = Keyboard.addListener('keyboardWillShow', (e) =>
      move(Math.max(0, e.endCoordinates.height - insets.bottom), e.duration),
    );
    const hide = Keyboard.addListener('keyboardWillHide', (e) => move(0, e.duration));
    // Too little room above the keys: the end of the content, where the field and its button are.
    const didShow = Keyboard.addListener('keyboardDidShow', () => {
      if (sizes.current.content > sizes.current.viewport + 1) scroll.current?.scrollToEnd({ animated: true });
    });
    return () => {
      show.remove();
      hide.remove();
      didShow.remove();
    };
  }, [mounted, insets.bottom, lift]);

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
    transform: [{ translateY: (reduceMotion ? 0 : (1 - shown.value) * height) - lift.value }],
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
            maxHeight: window.height - insets.top - 12 - keyboardRoom,
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
        {title ? (
          <View className="mt-16 flex-row items-center justify-between" style={{ gap: 12 }}>
            <Text variant="headingMd" accessibilityRole="header" style={{ flexShrink: 1 }}>
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
              <Host matchContents pointerEvents="none" ignoreSafeArea="all">
                <NativeIcon source={icons.close} size={12} color={theme.foreground} />
              </Host>
            </Pressable>
          </View>
        ) : null}
        {subtitle ? (
          <Text variant="bodySm" tone="muted" style={{ marginTop: 8 }}>
            {subtitle}
          </Text>
        ) : null}
        <ScrollView
          ref={scroll}
          style={{ marginTop: subtitle ? 20 : title ? 16 : 20, flexShrink: 1 }}
          scrollEnabled={contentOverflows}
          showsVerticalScrollIndicator={contentOverflows}
          keyboardShouldPersistTaps="handled"
          onLayout={(e) => measure('viewport', e.nativeEvent.layout.height)}
          onContentSizeChange={(_w, h) => measure('content', h)}
        >
          {children}
        </ScrollView>
      </Animated.View>
      {overlay ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {overlay}
        </View>
      ) : null}
    </Modal>
  );
}
