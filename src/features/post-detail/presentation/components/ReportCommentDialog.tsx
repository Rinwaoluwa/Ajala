import { useState } from 'react';
import { View } from 'react-native';

import { Button, CheckboxRow, Dialog, Text, TextArea } from '@shared/components';
import { useFontScale } from '@shared/hooks/useFontScale';
import { useTheme } from '@shared/hooks/useTheme';

import type { ReportReason } from '../../domain/entities/PostDetail';
import type { PostDetailErrorCode } from '../../domain/entities/PostDetailError';
import { REPORT_DETAILS_MAX, canSubmitCommentReport } from '../../domain/usecases/PostDetailUseCases';
import { postCopy, postErrorMessages } from '../copy';

const REASONS: ReportReason[] = ['harassment', 'impersonation', 'spam', 'inappropriate_content', 'other'];

/**
 * "Report comment": the app's dialog card with the API's five reasons
 * (`ReportCommentDto`, one of them), details (required for "Something else"),
 * and Cancel / Submit report. Drawn like "Report activity" so the two feel the
 * same; ticking a reason clears the one before, since the API takes one. A
 * refusal — already reported, reporting paused (403 `REPORTING_PAUSED`) — is
 * said under the details box. Each opening starts empty.
 */
export function ReportCommentDialog({
  isPresented,
  submitting,
  error,
  onSubmit,
  onDismiss,
}: {
  isPresented: boolean;
  submitting: boolean;
  error: PostDetailErrorCode | null;
  onSubmit: (reason: ReportReason | null, details: string) => void;
  onDismiss: () => void;
}) {
  const theme = useTheme();
  const stacked = useFontScale() > 1.3;
  const copy = postCopy.reportComment;
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  // A fresh form each time it opens (adjusted during render, so the old one never
  // shows for a frame); the details box is remounted to clear it.
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
      <Text variant="bodySm" tone="muted" className="mt-8">
        {copy.intro}
      </Text>
      <View className="mt-8">
        {REASONS.map((r) => (
          <CheckboxRow
            key={r}
            label={copy.reasons[r]}
            checked={reason === r}
            onToggle={() => setReason((current) => (current === r ? null : r))}
          />
        ))}
      </View>
      <View className="mt-12">
        <TextArea
          key={round}
          label={reason === 'other' ? copy.detailsRequired : copy.details}
          placeholder={copy.placeholder}
          filled
          lines={3}
          maxLength={REPORT_DETAILS_MAX}
          onChangeText={setDetails}
          helper={`${details.length}/${REPORT_DETAILS_MAX}`}
          error={error ? postErrorMessages[error] : null}
        />
      </View>
      <View style={{ marginTop: 20, flexDirection: stacked ? 'column-reverse' : 'row', gap: 10 }}>
        <View style={{ flex: stacked ? undefined : 1 }}>
          <Button label={copy.cancel} variant="secondary" fullWidth surface={theme.surface} onPress={onDismiss} />
        </View>
        <View style={{ flex: stacked ? undefined : 2 }}>
          <Button
            label={copy.submit}
            fullWidth
            surface={theme.surface}
            loading={submitting}
            disabled={!canSubmitCommentReport(reason, details)}
            onPress={() => onSubmit(reason, details)}
          />
        </View>
      </View>
    </Dialog>
  );
}
