import { BottomSheet, Column, Text as ExpoText } from '@expo/ui';
import { useWindowDimensions } from 'react-native';

import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER, textStyles } from '@shared/theme';

import { ButtonCore } from '../ui/Button';
import { icons } from '../ui/icons';
import { NativeIcon } from '../ui/NativeIcon';

/**
 * A bottom sheet that confirms something went through, with one way forward.
 *
 * From the "Email verified!" design (modal-8): a 40pt tinted badge with a check,
 * a Plus Jakarta 20/28 heading in the heading colour, a muted Inter 14/20 message,
 * then a full-width large button. 20pt padding; 12pt from badge to heading, 4pt to
 * the message, 28pt to the button.
 *
 * Built from Expo UI primitives only. The sheet presents in its own view
 * controller, so its content is SwiftUI / Compose throughout, including the
 * button (`ButtonCore`, the host-free half of `Button`).
 *
 * `onDismiss` runs when the user swipes the sheet away. There is only one way
 * forward, so callers usually treat that the same as the action.
 */

const BADGE = 40;
const BADGE_RADIUS = 8;
const MARK = 16;

export type StatusSheetProps = {
  isPresented: boolean;
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
  onDismiss: () => void;
};

export function StatusSheet({
  isPresented,
  title,
  message,
  actionLabel,
  onAction,
  onDismiss,
}: StatusSheetProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();

  return (
    <BottomSheet
      isPresented={isPresented}
      onDismiss={onDismiss}
      showDragIndicator={false}
      containerColor={theme.background}
      contentPadding={{ top: SCREEN_GUTTER, left: SCREEN_GUTTER, right: SCREEN_GUTTER, bottom: 8 }}
    >
      <Column alignment="start" spacing={0}>
        {/* Sized by padding around the mark rather than a fixed frame: Expo UI pins
            content in a fixed frame to its top-left, which put the check in the corner. */}
        <Column
          style={{
            padding: (BADGE - MARK) / 2,
            borderRadius: BADGE_RADIUS,
            backgroundColor: theme.successSoft,
          }}
        >
          <NativeIcon source={icons.checkCircle} size={MARK} color={theme.success} />
        </Column>
        <ExpoText
          style={{ paddingTop: 12 }}
          textStyle={{
            fontFamily: textStyles.headingMd.fontFamily,
            fontSize: textStyles.headingMd.fontSize,
            lineHeight: textStyles.headingMd.lineHeight,
            fontWeight: '600',
            color: theme.heading,
          }}
        >
          {title}
        </ExpoText>
        <ExpoText
          style={{ paddingTop: 4 }}
          textStyle={{
            fontFamily: textStyles.bodySm.fontFamily,
            fontSize: textStyles.bodySm.fontSize,
            lineHeight: textStyles.bodySm.lineHeight,
            color: theme.muted,
          }}
        >
          {message}
        </ExpoText>
        <Column style={{ paddingTop: 28 }}>
          <ButtonCore
            label={actionLabel}
            size="lg"
            width={width - SCREEN_GUTTER * 2}
            onPress={onAction}
            testID="status-sheet-action"
          />
        </Column>
      </Column>
    </BottomSheet>
  );
}
