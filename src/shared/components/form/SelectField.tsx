import { Button as ExpoButton, Host, Row, Spacer, Text as ExpoText } from '@expo/ui';
import { View } from 'react-native';

import { useMeasuredWidth } from '@shared/hooks/useMeasuredWidth';
import { useTheme } from '@shared/hooks/useTheme';
import { layout, textStyles } from '@shared/theme';

import { a11yLabel } from '../ui/nativeA11y';
import { NativeIcon, type NativeIconSource } from '../ui/NativeIcon';
import { NATIVE_BUTTON_INSET } from '../ui/nativeButtonInset';
import { FieldFrame } from './FieldFrame';

/**
 * A field that is picked rather than typed, such as a date of birth.
 *
 * It looks like a text field (same label, outline and type) but the box is one
 * native button: the value or placeholder on the left, an icon on the right.
 * Tapping it runs `onPress`, which usually opens a picker sheet.
 */

const input = layout.input;

export type SelectFieldProps = {
  label: string;
  /** The chosen value, formatted for display. Null shows the placeholder. */
  value: string | null;
  placeholder: string;
  icon: NativeIconSource;
  onPress: () => void;
  error?: string | null;
  testID?: string;
};

export function SelectField({
  label,
  value,
  placeholder,
  icon,
  onPress,
  error,
  testID,
}: SelectFieldProps) {
  const theme = useTheme();
  const { width, onLayout } = useMeasuredWidth();
  const innerHeight = input.heightWithIcon - 2;

  return (
    <FieldFrame label={label} error={error} hasTrailing onPressBox={onPress} testID={testID}>
      {/* The button spans the whole box, so it needs the box's inner width in points.
          It reaches out by the native button's own content padding (Android) so the
          value and icon land where the other fields put theirs. */}
      <View
        style={{ flex: 1, height: innerHeight, marginHorizontal: -NATIVE_BUTTON_INSET }}
        onLayout={onLayout}
      >
        {width > 0 ? (
          <Host style={{ width: '100%', height: innerHeight }}>
            <ExpoButton
              variant="text"
              onPress={onPress}
              modifiers={a11yLabel(`${label}, ${value ?? 'not set'}`)}
              testID={testID ? `${testID}-button` : undefined}
              style={{ width, height: innerHeight }}
            >
              <Row alignment="center" style={{ width: width - NATIVE_BUTTON_INSET * 2 }}>
                <ExpoText
                  textStyle={{
                    fontFamily: textStyles.bodySm.fontFamily,
                    fontSize: textStyles.bodySm.fontSize,
                    color: value ? theme.foreground : theme.placeholder,
                  }}
                >
                  {value ?? placeholder}
                </ExpoText>
                <Spacer flexible />
                <NativeIcon source={icon} size={input.iconSize} color={theme.muted} />
              </Row>
            </ExpoButton>
          </Host>
        ) : null}
      </View>
    </FieldFrame>
  );
}
