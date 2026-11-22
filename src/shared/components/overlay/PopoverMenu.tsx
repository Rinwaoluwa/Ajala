import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics } from '@shared/feedback/haptics';
import { useFontScale } from '@shared/hooks/useFontScale';
import { useTheme } from '@shared/hooks/useTheme';

import { Text } from '../ui/Text';

/**
 * A menu that opens from the button that asked for it (the feed post's ⋮, as
 * the Home design draws it): a card under the button, its right edge on the
 * button's, each choice a title with a line under it saying what it does.
 *
 * `MenuButton` is the platform's own menu (a title per choice). This one is for
 * choices that need their second line.
 *
 * The card is placed from where the button is on screen when tapped. It opens
 * under the button, or over it when there is no room below, and never runs off
 * the screen. Motion: it fades in and grows a little out of the button's corner
 * (140ms), and fades away (100ms); with Reduce Motion it only fades. A light
 * tap of haptics on opening, a selection tick on a choice.
 *
 * A choice runs once the menu has gone: iOS will not present a dialog or a
 * sheet while another window is still closing, and would drop it silently.
 */

export type PopoverAction = {
  label: string;
  /** The line under it: what choosing it does. */
  hint?: string;
  /** Drawn in red: reporting, deleting. */
  destructive?: boolean;
  onPress: () => void;
};

export type PopoverMenuProps = {
  /** What the button looks like; the menu opens from it. */
  children: ReactNode;
  actions: readonly PopoverAction[];
  /** Read out for the button. */
  accessibilityLabel: string;
};

const WIDTH = 312;
const EDGE = 12;
const GAP = 6;
const OPEN_MS = 140;
const CLOSE_MS = 100;
/** A little longer than the window takes to go, before a choice may open another. */
const AFTER_CLOSE_MS = 220;

type Anchor = { x: number; y: number; width: number; height: number };

export function PopoverMenu({ children, actions, accessibilityLabel }: PopoverMenuProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const screen = useWindowDimensions();
  const scale = useFontScale();
  const reduceMotion = useReducedMotion();
  const button = useRef<View>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const shown = useSharedValue(0);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (pending.current && clearTimeout(pending.current)), []);

  const open = () => {
    haptics.tap();
    button.current?.measureInWindow((x, y, width, height) => setAnchor({ x, y, width, height }));
  };

  useEffect(() => {
    if (anchor) shown.set(withTiming(1, { duration: OPEN_MS, easing: Easing.out(Easing.cubic) }));
  }, [anchor, shown]);

  const unmount = useCallback(() => setAnchor(null), []);
  const close = useCallback(
    (then?: () => void) => {
      shown.set(
        withTiming(0, { duration: CLOSE_MS, easing: Easing.in(Easing.quad) }, (finished) => {
          if (finished) runOnJS(unmount)();
        }),
      );
      if (then) pending.current = setTimeout(then, CLOSE_MS + AFTER_CLOSE_MS);
    },
    [shown, unmount],
  );

  const cardStyle = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: reduceMotion ? [] : [{ scale: 0.94 + 0.06 * shown.value }],
  }));

  // Under the button, or over it when the card would run past the foot of the screen.
  // The height is an estimate (two lines a row, growing with the text size): it only picks the side.
  const width = Math.min(WIDTH, screen.width - EDGE * 2);
  const estimated = actions.length * 60 * scale + 16;
  const below = anchor ? anchor.y + anchor.height + GAP : 0;
  const fitsBelow = below + estimated <= screen.height - insets.bottom - EDGE;
  const right = anchor
    ? Math.min(Math.max(screen.width - (anchor.x + anchor.width), EDGE), screen.width - width - EDGE)
    : EDGE;

  return (
    <>
      <Pressable
        ref={button}
        collapsable={false}
        onPress={open}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ expanded: anchor !== null }}
      >
        {/* The face only draws: a button inside it must not take the tap. */}
        <View pointerEvents="none">{children}</View>
      </Pressable>
      {anchor ? (
        <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={() => close()}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} accessibilityLabel="Close menu" />
          <Animated.View
            accessibilityViewIsModal
            accessibilityRole="menu"
            style={[
              {
                position: 'absolute',
                right,
                width,
                ...(fitsBelow
                  ? { top: below, transformOrigin: 'top right' }
                  : { bottom: screen.height - anchor.y + GAP, transformOrigin: 'bottom right' }),
                borderRadius: 14,
                paddingVertical: 6,
                backgroundColor: theme.card,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: theme.border,
                shadowColor: '#000',
                shadowOpacity: 0.14,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 8 },
                elevation: 8,
              },
              cardStyle,
            ]}
          >
            {actions.map((action) => (
              // A plain style: a style function on a Pressable is dropped by the class-name interop.
              <TouchableOpacity
                key={action.label}
                activeOpacity={0.55}
                onPress={() => {
                  haptics.select();
                  close(action.onPress);
                }}
                accessibilityRole="menuitem"
                accessibilityLabel={action.label}
                accessibilityHint={action.hint}
                style={{ paddingHorizontal: 18, paddingVertical: 10, gap: 2 }}
              >
                <Text variant="labelMd" style={action.destructive ? { color: theme.destructive } : undefined}>
                  {action.label}
                </Text>
                {action.hint ? (
                  <Text variant="bodySm" tone="muted">
                    {action.hint}
                  </Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </Animated.View>
        </Modal>
      ) : null}
    </>
  );
}
