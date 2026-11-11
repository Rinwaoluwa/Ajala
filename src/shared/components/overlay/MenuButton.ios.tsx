import { Button, Menu, Rectangle } from '@expo/ui/swift-ui';
import { contentShape, foregroundStyle, frame, shapes } from '@expo/ui/swift-ui/modifiers';
import { StyleSheet, View } from 'react-native';
import type { ComponentProps } from 'react';

import type { MenuButtonProps } from './MenuButton.types';
import { Host } from '../ui/Host';

export type { MenuAction, MenuButtonProps } from './MenuButton.types';

type SFSymbol = NonNullable<ComponentProps<typeof Button>['systemImage']>;

/**
 * iOS: the native pull-down menu (as in Notes), opening from the button with
 * the system's own animation, glass and haptics.
 *
 * The button keeps its React Native look; an invisible SwiftUI `Menu` covers it
 * exactly and takes the tap, so the menu is anchored to it.
 *
 * A choice runs once the menu has finished closing: iOS will not present a new
 * screen (the report dialog, a confirmation) while the menu's own dismissal is
 * still animating, and would drop it without a word.
 */

/** A little longer than the menu's closing animation. */
const MENU_CLOSE_MS = 350;
export function MenuButton({ children, actions, accessibilityLabel }: MenuButtonProps) {
  return (
    <View accessibilityLabel={accessibilityLabel}>
      <View pointerEvents="none">{children}</View>
      <Host style={StyleSheet.absoluteFill} ignoreSafeArea="all">
        <Menu
          label={
            <Rectangle
              modifiers={[
                // Clear, but still hit-tested over its whole frame.
                foregroundStyle('#00000001'),
                frame({ maxWidth: Infinity, maxHeight: Infinity }),
                contentShape(shapes.rectangle()),
              ]}
            />
          }
        >
          {actions.map((a) => (
            <Button
              key={a.label}
              label={a.label}
              systemImage={a.systemImage as SFSymbol | undefined}
              role={a.destructive ? 'destructive' : 'default'}
              onPress={() => setTimeout(a.onPress, MENU_CLOSE_MS)}
            />
          ))}
        </Menu>
      </Host>
    </View>
  );
}
