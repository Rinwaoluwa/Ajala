import { useState } from 'react';
import { View } from 'react-native';

import { Button, Dialog, Text, TextArea } from '@shared/components';
import { useFontScale } from '@shared/hooks/useFontScale';

import type { PersonReportReason } from '../../domain/entities/PublicProfile';
import { REPORT_DETAILS_MAX, canSubmitPersonReport } from '../../domain/usecases/ProfileViewUseCases';
import { profileErrorMessages } from '../copy';
import type { ProfileErrorCode } from '../../domain/entities/ProfileError';
import { profileViewCopy } from '../profileViewCopy';
import { RadioOption } from './RadioOption';

const REASONS: PersonReportReason[] = [
  'harassment',
  'impersonation',
  'spam',
  'inappropriate_content',
  'other',
];

/**
 * "Report profile": a card over the profile with the API's five reasons as a
 * one-of list (`ReportUserDto`), details (required for "Something else"), and
 * Cancel / Submit report. Each opening starts empty; a refusal (already
 * reported, your own profile) is said under the form.
 */
export function ReportProfileDialog({
  isPresented,
  submitting,
  error,
  onSubmit,
  onDismiss,
}: {
  isPresented: boolean;
  submitting: boolean;
  error: ProfileErrorCode | null;
  onSubmit: (reason: PersonReportReason, details: string) => void;
  onDismiss: () => void;
}) {
  const copy = profileViewCopy.report;
  const stacked = useFontScale() > 1.3;
  const [reason, setReason] = useState<PersonReportReason | null>(null);
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
      <Text variant="bodySm" tone="muted" className="mt-8">
        {copy.intro}
      </Text>
      <View className="mt-12" accessibilityRole="radiogroup">
        {REASONS.map((r) => (
          <RadioOption
            key={r}
            label={profileViewCopy.reportReasons[r]}
            selected={reason === r}
            onPress={() => setReason(r)}
          />
        ))}
      </View>
      <View className="mt-12">
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
        <Text variant="bodySm" tone="destructive" className="mt-8" accessibilityLiveRegion="polite">
          {profileErrorMessages[error]}
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
            disabled={!canSubmitPersonReport(reason, details)}
            onPress={() => reason && onSubmit(reason, details)}
          />
        </View>
      </View>
    </Dialog>
  );
}
