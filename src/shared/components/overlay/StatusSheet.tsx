import { BottomSheet, Column, Text as ExpoText } from '@expo/ui';
import { useEffect } from 'react';
import { useWindowDimensions } from 'react-native';

import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER, palette, textStyles } from '@shared/theme';

import { ButtonCore } from '../ui/Button';
import { icons } from '../ui/icons';
import { NativeIcon, type NativeIconSource } from '../ui/NativeIcon';
import { nativeTextScaleCap } from '../ui/nativeTextScale';
import { haptics } from '@shared/feedback/haptics';

/**
 * A bottom sheet that reports how something went, with one way forward.
 *
 * From the modal-8 variants: a drag handle, a 40pt tinted badge with a mark, a
 * Plus Jakarta 20/28 heading, a muted Inter 14/20 message, then a full-width large
 * pill. 20pt padding; 12pt from badge to heading, 4pt to the message, 28pt to the
 * button.
 *
 * `tone` is the status, and picks the badge tint, the mark, the heading colour and
 * the button fill together, because the design always changes them together:
 *   - `info` — indigo, an "i" ("Connection interrupted")
 *   - `warning` — Marigold, a triangle ("Check your details")
 *   - `error` — red, a cross ("Email verification failed")
 *   - `success` — a green check on mint, the teal primary button ("Email verified!")
 *
 * `titleTone="default"` sets the heading in the text colour instead. The password
 * reset's success sheet does that ("Password reset successful" is ink on light).
 *
 * Built from Expo UI primitives only. The sheet presents in its own view
 * controller, so its content is SwiftUI / Compose throughout, including the
 * button: `ButtonCore`, as the primary button for success and tinted to the
 * status colour for the other three, so all four share its metrics.
 *
 * `actionLoading` shows the button's spinner while the action waits on something
 * (the verified sheet's Continue waits on `GET /me` to know where to go). Only a
 * success sheet waits on anything, so only it takes the spinner.
 *
 * `onDismiss` runs when the user swipes the sheet away. There is only one way
 * forward, so callers usually treat that the same as the action.
 *
 * The badge tints stay light in dark mode: the dark "Email verified!" and
 * "Email verification failed" frames draw them that way, on the Deep surface.
 */

const BADGE = 40;
const BADGE_RADIUS = 8;
const MARK = 16;

export type StatusSheetTone = 'info' | 'warning' | 'error' | 'success';
export type StatusSheetTitleTone = 'status' | 'default';

export type StatusSheetProps = {
  isPresented: boolean;
  title: string;
  tone?: StatusSheetTone;
  titleTone?: StatusSheetTitleTone;
  message: string;
  actionLabel: string;
  /** In practice success sheets only; see the note above. */
  actionLoading?: boolean;
  onAction: () => void;
  onDismiss: () => void;
};

type ToneStyle = {
  badge: string;
  mark: NativeIconSource;
  markColor: string;
  title: string;
  /** Absent for success, which uses the primary button as it is. */
  action?: { fill: string; label: string };
};

export function StatusSheet({
  isPresented,
  title,
  tone = 'success',
  titleTone = 'status',
  message,
  actionLabel,
  actionLoading = false,
  onAction,
  onDismiss,
}: StatusSheetProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  // The sheet's news, felt as well as seen: success, a warning, or an error. Info is quiet.
  useEffect(() => {
    if (!isPresented) return;
    if (tone === 'success') haptics.success();
    else if (tone === 'warning') haptics.warning();
    else if (tone === 'error') haptics.error();
  }, [isPresented, tone]);
  const actionWidth = width - SCREEN_GUTTER * 2;

  // One lookup rather than a chain of conditionals: adding a tone is one entry.
  const tones: Record<StatusSheetTone, ToneStyle> = {
    info: {
      badge: theme.infoSoft,
      mark: icons.info,
      markColor: theme.info,
      title: theme.info,
      action: { fill: theme.info, label: palette.white },
    },
    warning: {
      badge: theme.warningSoft,
      mark: icons.warning,
      markColor: theme.accent,
      title: theme.accent,
      // The design labels this button in white. White on Marigold is about 1.8:1,
      // so it takes Marigold's own ink label instead — flagged to design.
      action: { fill: theme.accent, label: theme.accentForeground },
    },
    error: {
      badge: theme.dangerSoft,
      mark: icons.close,
      markColor: theme.danger,
      title: theme.danger,
      action: { fill: theme.danger, label: palette.white },
    },
    success: {
      badge: theme.successSoft,
      mark: icons.checkCircle,
      // The brand green rather than the scheme's: the badge behind it stays light
      // on dark, where the dark-scheme green would wash out.
      markColor: palette.success,
      title: theme.successTitle,
    },
  };
  const style = tones[tone];

  return (
    <BottomSheet
      isPresented={isPresented}
      onDismiss={onDismiss}
      containerColor={theme.surface}
      contentPadding={{ top: SCREEN_GUTTER, left: SCREEN_GUTTER, right: SCREEN_GUTTER, bottom: 8 }}
    >
      <Column alignment="start" spacing={0}>
        {/* Sized by padding around the mark rather than a fixed frame: Expo UI pins
            content in a fixed frame to its top-left, which put the check in the corner. */}
        <Column
          style={{
            padding: (BADGE - MARK) / 2,
            borderRadius: BADGE_RADIUS,
            backgroundColor: style.badge,
          }}
        >
          <NativeIcon source={style.mark} size={MARK} color={style.markColor} />
        </Column>
        <ExpoText
          modifiers={nativeTextScaleCap()}
          style={{ paddingTop: 12 }}
          textStyle={{
            fontFamily: textStyles.headingMd.fontFamily,
            fontSize: textStyles.headingMd.fontSize,
            lineHeight: textStyles.headingMd.lineHeight,
            fontWeight: '600',
            color: titleTone === 'default' ? theme.foreground : style.title,
          }}
        >
          {title}
        </ExpoText>
        <ExpoText
          modifiers={nativeTextScaleCap()}
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
            width={actionWidth}
            tint={style.action}
            loading={actionLoading}
            onPress={onAction}
            testID="status-sheet-action"
          />
        </Column>
      </Column>
    </BottomSheet>
  );
}
