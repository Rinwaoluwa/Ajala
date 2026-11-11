import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Host, Button, CheckboxRow, Dialog, NativeIcon, Text, TextArea, icons } from '@shared/components';
import { useFontScale } from '@shared/hooks/useFontScale';
import { useTheme } from '@shared/hooks/useTheme';

import type { ExploreErrorCode } from '../../domain/entities/ExploreError';
import {
  REPORT_REASONS,
  canSubmitReport,
  reportDetailsRoom,
  type ReportReasonKey,
} from '../../domain/rules/exploreRules';
import { exploreCopy, exploreErrorMessages } from '../copy';

/**
 * "Report activity" (Figma): a card over the map with the nine reasons as
 * checkboxes, "Additional details (required)", and Cancel / Submit report.
 * Submit waits for at least one reason and some details.
 *
 * The API takes one reason, so the ticked ones are also written at the head of
 * the details (`toReportPayload`); the count under the box allows for that line.
 * Each opening starts empty.
 */
export function ReportActivityDialog({
  isPresented,
  submitting,
  error,
  onSubmit,
  onDismiss,
}: {
  isPresented: boolean;
  submitting: boolean;
  error: ExploreErrorCode | null;
  onSubmit: (keys: ReportReasonKey[], details: string) => void;
  onDismiss: () => void;
}) {
  const theme = useTheme();
  const stacked = useFontScale() > 1.3;
  const copy = exploreCopy.report;
  const [keys, setKeys] = useState<ReportReasonKey[]>([]);
  const [details, setDetails] = useState('');
  // A fresh form each time it opens (adjusted during render, so the old one
  // never shows for a frame); the details box is remounted to clear it.
  const [round, setRound] = useState(0);
  const [wasPresented, setWasPresented] = useState(isPresented);
  if (isPresented !== wasPresented) {
    setWasPresented(isPresented);
    if (isPresented) {
      setKeys([]);
      setDetails('');
      setRound((r) => r + 1);
    }
  }

  const room = reportDetailsRoom(keys);
  const toggle = (key: ReportReasonKey) =>
    setKeys((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));

  return (
    <Dialog isPresented={isPresented} onDismiss={onDismiss} accessibilityLabel={copy.title}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text variant="headingMd" className="flex-1" accessibilityRole="header">
          {copy.title}
        </Text>
        <Pressable
          onPress={onDismiss}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={copy.cancel}
        >
          <Host matchContents pointerEvents="none" ignoreSafeArea="all">
            <NativeIcon source={icons.close} size={16} color={theme.foreground} />
          </Host>
        </Pressable>
      </View>
      <Text variant="bodySm" tone="muted" className="mt-8">
        {copy.intro}
      </Text>

      <View className="mt-8">
        {REPORT_REASONS.map((r) => (
          <CheckboxRow
            key={r.key}
            label={r.label}
            checked={keys.includes(r.key)}
            onToggle={() => toggle(r.key)}
          />
        ))}
      </View>

      <View className="mt-12">
        <TextArea
          key={round}
          label={copy.details}
          placeholder={copy.detailsPlaceholder}
          filled
          lines={4}
          maxLength={room}
          onChangeText={setDetails}
          helper={`${Math.min(details.length, room)}/${room}`}
          error={error ? exploreErrorMessages[error] : null}
          testID="report-details"
        />
      </View>

      <View style={{ marginTop: 20, flexDirection: stacked ? 'column-reverse' : 'row', gap: 10 }}>
        <View style={{ flex: stacked ? undefined : 1 }}>
          <Button
            label={copy.cancel}
            variant="secondary"
            fullWidth
            surface={theme.surface}
            onPress={onDismiss}
          />
        </View>
        <View style={{ flex: stacked ? undefined : 2 }}>
          <Button
            label={copy.submit}
            fullWidth
            surface={theme.surface}
            loading={submitting}
            disabled={!canSubmitReport(keys, details)}
            onPress={() => onSubmit(keys, details.slice(0, room))}
            testID="report-submit"
          />
        </View>
      </View>
    </Dialog>
  );
}
