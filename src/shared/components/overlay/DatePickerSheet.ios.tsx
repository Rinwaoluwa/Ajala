import { BottomSheet, Button as ExpoButton, Column, Row, Spacer, Text as ExpoText } from '@expo/ui';
import { DatePicker } from '@expo/ui/swift-ui';
import { datePickerStyle, frame, tint } from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';

import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER, textStyles } from '@shared/theme';

import type { DatePickerSheetProps } from './DatePickerSheet';

/**
 * iOS: a bottom sheet with a title, a Done button and a date wheel.
 *
 * The sheet's content is SwiftUI throughout — Expo UI's BottomSheet presents in
 * its own view controller, so a React Native view placed in it would not receive
 * touches without extra hosting. The wheel is SwiftUI's own `DatePicker`.
 *
 * The wheel edits a draft. Done commits it; swiping the sheet away discards it.
 */
export function DatePickerSheet({
  isPresented,
  title,
  value,
  minimumDate,
  maximumDate,
  onConfirm,
  onDismiss,
}: DatePickerSheetProps) {
  const theme = useTheme();
  const [draft, setDraft] = useState(value);
  const [wasPresented, setWasPresented] = useState(isPresented);

  // Each time the sheet opens it starts from the current value, not an old draft.
  // Adjusted during render rather than in an effect, so the wheel never shows the
  // stale date for a frame.
  if (isPresented !== wasPresented) {
    setWasPresented(isPresented);
    if (isPresented) setDraft(value);
  }

  return (
    <BottomSheet
      isPresented={isPresented}
      onDismiss={onDismiss}
      containerColor={theme.background}
      contentPadding={{ top: SCREEN_GUTTER, left: SCREEN_GUTTER, right: SCREEN_GUTTER, bottom: 8 }}
    >
      <Column alignment="start" spacing={8}>
        <Row alignment="center">
          <ExpoText
            textStyle={{
              fontFamily: textStyles.headingSm.fontFamily,
              fontSize: textStyles.headingSm.fontSize,
              lineHeight: textStyles.headingSm.lineHeight,
              fontWeight: '600',
              color: theme.foreground,
            }}
          >
            {title}
          </ExpoText>
          <Spacer />
          <ExpoButton variant="text" onPress={() => onConfirm(draft)} testID="date-picker-done">
            <ExpoText
              textStyle={{
                fontFamily: textStyles.labelMd.fontFamily,
                fontSize: textStyles.labelMd.fontSize,
                fontWeight: '500',
                color: theme.primary,
              }}
            >
              Done
            </ExpoText>
          </ExpoButton>
        </Row>
        <DatePicker
          selection={draft}
          displayedComponents={['date']}
          range={minimumDate || maximumDate ? { start: minimumDate, end: maximumDate } : undefined}
          onDateChange={setDraft}
          // The wheel's own width is narrower than the sheet; centre it across the full width.
          modifiers={[datePickerStyle('wheel'), tint(theme.primary), frame({ maxWidth: Infinity })]}
        />
      </Column>
    </BottomSheet>
  );
}
