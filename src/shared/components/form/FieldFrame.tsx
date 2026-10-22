import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { useFontScale } from '@shared/hooks/useFontScale';
import { useTheme } from '@shared/hooks/useTheme';
import { layout } from '@shared/theme';

import { Text } from '../ui/Text';

/**
 * The shared chrome of every form field: label, outlined box, optional error line.
 *
 * Measured on the Create Account screen: label Inter 12/16 with a 4pt gap to the
 * box; the box is 38pt tall, or 42pt when a 20pt trailing icon sets its height, with
 * a 1pt outline and 6pt radius. Text starts 8pt in, and a trailing icon sits 16pt
 * from the right edge.
 *
 * With a larger text-size setting the box grows by however much the line of text
 * inside it grew (`fieldLineHeight`), so the text is never clipped. At the
 * default size it is exactly the measured height.
 *
 * The box is React Native; what goes inside it (a native text field, a native
 * button) is the caller's. Tapping the padding runs `onPressBox`, so the whole box
 * is a target, not just the text inside it.
 */

const input = layout.input;
/**
 * Figma draws the outline inside the box, over its padding. React Native pads
 * inside the border instead, so the border width comes off each padding to put
 * text and icons where the design has them.
 */
const BORDER = 1;

export type FieldFrameProps = {
  label: string;
  /** Drawn in the primary colour while the field is being edited. */
  focused?: boolean;
  error?: string | null;
  /** Whether a trailing icon sets the taller box height. */
  hasTrailing?: boolean;
  onPressBox?: () => void;
  children: ReactNode;
  testID?: string;
};

export function FieldFrame({
  label,
  focused = false,
  error,
  hasTrailing = false,
  onPressBox,
  children,
  testID,
}: FieldFrameProps) {
  const theme = useTheme();
  const growth = fieldLineHeight(useFontScale()) - FIELD_LINE_HEIGHT;

  const borderColor = error ? theme.destructive : focused ? theme.primary : theme.controlBorder;

  return (
    <View testID={testID}>
      <Text variant="labelXs" tone="muted">
        {label}
      </Text>
      <Pressable
        onPress={onPressBox}
        // The field inside is the accessible element; the box is only a larger target.
        accessible={false}
        style={{
          marginTop: input.labelGap,
          minHeight: (hasTrailing ? input.heightWithIcon : input.height) + growth,
          borderWidth: BORDER,
          borderColor,
          borderRadius: input.radius,
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: input.paddingX - BORDER,
          paddingRight: (hasTrailing ? input.trailingPadding : input.paddingX) - BORDER,
        }}
      >
        {children}
      </Pressable>
      {error ? (
        <Text variant="bodyXs" tone="destructive" className="mt-4" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/** The inner height a single line of field text occupies, at the default text size. */
export const FIELD_LINE_HEIGHT = 20;

/** That line's height at the current text size (`useFontScale()`). */
export function fieldLineHeight(scale: number): number {
  return Math.ceil(FIELD_LINE_HEIGHT * scale);
}
