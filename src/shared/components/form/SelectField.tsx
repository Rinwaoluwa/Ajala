import { memo } from 'react';
import { Button as ExpoButton, Host, Row, Spacer, Text as ExpoText } from '@expo/ui';
import { View } from 'react-native';

import { useFontScale } from '@shared/hooks/useFontScale';
import { useMeasuredWidth } from '@shared/hooks/useMeasuredWidth';
import { useTheme } from '@shared/hooks/useTheme';
import { layout, textStyles } from '@shared/theme';

import { a11yLabel } from '../ui/nativeA11y';
import { NativeIcon, type NativeIconSource } from '../ui/NativeIcon';
import { NATIVE_BUTTON_INSET } from '../ui/nativeButtonInset';
import { nativeTextScaleCap } from '../ui/nativeTextScale';
import { FIELD_LINE_HEIGHT, FieldFrame, fieldLineHeight } from './FieldFrame';

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
  helper?: string | null;
  testID?: string;
};

function SelectFieldComponent({
  label,
  value,
  placeholder,
  icon,
  onPress,
  error,
  helper,
  testID,
}: SelectFieldProps) {
  const theme = useTheme();
  const { width, onLayout } = useMeasuredWidth();
  // Grows with the text-size setting by as much as the value's line does.
  const innerHeight = input.heightWithIcon - 2 + fieldLineHeight(useFontScale()) - FIELD_LINE_HEIGHT;

  return (
    <FieldFrame label={label} error={error} helper={helper} hasTrailing onPressBox={onPress} testID={testID}>
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
              modifiers={[...a11yLabel(`${label}, ${value ?? 'not set'}`), ...nativeTextScaleCap()]}
              testID={testID ? `${testID}-button` : undefined}
              style={{ width, height: innerHeight }}
            >
              <Row alignment="center" style={{ width: width - NATIVE_BUTTON_INSET * 2 }}>
                {/* One line, cut with "…": the box is one line tall, so a second would be clipped. */}
                <ExpoText
                  numberOfLines={1}
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

/**
 * Memoised: this renders native Expo UI views, so re-rendering it for a change
 * elsewhere on the form does real native work. Its props are stable by
 * construction — see the hooks that build them.
 */
export const SelectField = memo(SelectFieldComponent);
