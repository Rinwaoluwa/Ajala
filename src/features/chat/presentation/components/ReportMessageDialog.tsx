import { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';

import { Button, Dialog, Text, TextArea } from '@shared/components';
import { useFontScale } from '@shared/hooks/useFontScale';
import { useTheme } from '@shared/hooks/useTheme';

import type { ReportReason } from '../../domain/entities/Chat';
import type { ChatErrorCode } from '../../domain/entities/ChatError';
import { REPORT_DETAILS_MAX } from '../../domain/rules/chatRules';
import { canSubmitReport } from '../../domain/usecases/ChatUseCases';
import { chatCopy, chatErrorMessages } from '../copy';

const REASONS: ReportReason[] = ['harassment', 'impersonation', 'spam', 'inappropriate_content', 'other'];

/**
 * "Report message" (`ReportMessageDto`): the API's five reasons as a one-of
 * list, a note (required for "Something else"), and Cancel / Submit report.
 * Laid out like the app's other report cards. Each opening starts empty; a
 * refusal (already reported, reporting paused) is said under the form.
 */
export function ReportMessageDialog({
  isPresented,
  submitting,
  error,
  onSubmit,
  onDismiss,
}: {
  isPresented: boolean;
  submitting: boolean;
  error: ChatErrorCode | null;
  onSubmit: (reason: ReportReason, details: string) => void;
  onDismiss: () => void;
}) {
  const copy = chatCopy.report;
  const stacked = useFontScale() > 1.3;
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [round, setRound] = useState(0);
  const [wasPresented, setWasPresented] = useState(isPresented);
  if (isPresented !== wasPresented) {
    setWasPresented(isPresented);
    if (isPresented) {
      setReason(null);
      setDetails('');
      setRound((r) => r + 1);
    }
  }

  return (
    <Dialog isPresented={isPresented} onDismiss={onDismiss} accessibilityLabel={copy.title}>
      <Text variant="headingMd" accessibilityRole="header">
        {copy.title}
      </Text>
      <Text variant="bodySm" tone="muted" style={{ marginTop: 8 }}>
        {copy.intro}
      </Text>
      <View style={{ marginTop: 12 }} accessibilityRole="radiogroup">
        {REASONS.map((r) => (
          <Radio key={r} label={copy.reasons[r]} selected={reason === r} onPress={() => setReason(r)} />
        ))}
      </View>
      <View style={{ marginTop: 12 }}>
        <TextArea
          key={round}
          label={reason === 'other' ? copy.detailsRequired : copy.detailsLabel}
          placeholder={copy.placeholder}
          onChangeText={setDetails}
          maxLength={REPORT_DETAILS_MAX}
          lines={3}
          filled
          helper={`${details.length}/${REPORT_DETAILS_MAX}`}
        />
      </View>
      {error ? (
        <Text variant="bodySm" tone="destructive" style={{ marginTop: 8 }} accessibilityLiveRegion="polite">
          {chatErrorMessages[error]}
        </Text>
      ) : null}
      <View style={{ flexDirection: stacked ? 'column-reverse' : 'row', gap: 12, marginTop: 20 }}>
        <View style={{ flex: stacked ? undefined : 1 }}>
          <Button label={copy.cancel} variant="neutral" fullWidth onPress={onDismiss} />
        </View>
        <View style={{ flex: stacked ? undefined : 1.6 }}>
          <Button
            label={copy.submit}
            fullWidth
            loading={submitting}
            disabled={!canSubmitReport(reason, details)}
            onPress={() => reason && onSubmit(reason, details)}
          />
        </View>
      </View>
    </Dialog>
  );
}

/** One reason: a ring that fills when chosen, and its label, wrapping at large text. */
function Radio({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 2,
          borderColor: selected ? theme.primary : theme.muted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected ? (
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.primary }} />
        ) : null}
      </View>
      <Text variant="bodyMd" style={{ flex: 1 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
