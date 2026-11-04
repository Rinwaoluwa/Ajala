import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { useSignOut } from '@features/auth';
import { Button, StatusSheet, Text, TextArea } from '@shared/components';

import { DELETE_REASON_MAX } from '../../domain/rules/settingsRules';
import { ConfirmItsYouDialog } from '../components/ConfirmItsYouDialog';
import { SettingsFrame } from '../components/SettingsFrame';
import { settingsCopy, settingsErrors } from '../copy';
import { useDeleteAccount } from '../hooks/useAccountFlows';

/**
 * Delete account (`DELETE /me`): what happens (14 days' grace, every device
 * signed out), an optional reason, then a confirmation. When the server asks,
 * "Confirm it's you" comes first. Once scheduled, a sheet gives the date and
 * this phone signs out.
 */
export function DeleteAccountScreen({ onBack }: { onBack: () => void }) {
  const copy = settingsCopy.remove;
  const flow = useDeleteAccount();
  const signOut = useSignOut();
  const [reason, setReason] = useState('');
  const change = useCallback((t: string) => setReason(t), []);

  const confirm = () =>
    Alert.alert(copy.confirmTitle, copy.confirmBody, [
      { text: settingsCopy.hub.cancel, style: 'cancel' },
      { text: copy.confirm, style: 'destructive', onPress: () => flow.submit(reason) },
    ]);

  const purgeDate = flow.purgeAt
    ? new Date(flow.purgeAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <SettingsFrame
      title={copy.title}
      onBack={onBack}
      footer={
        <Button
          label={copy.confirm}
          variant="cta"
          size="lg"
          fullWidth
          loading={flow.deleting}
          onPress={confirm}
        />
      }
    >
      <Text variant="bodyMd" tone="muted">
        {copy.intro}
      </Text>
      <TextArea
        label={copy.reason}
        placeholder={copy.reasonPlaceholder}
        onChangeText={change}
        maxLength={DELETE_REASON_MAX}
        lines={4}
        helper={`${reason.length}/${DELETE_REASON_MAX}`}
      />
      {flow.error ? (
        <Text variant="bodySm" tone="destructive" accessibilityLiveRegion="polite">
          {settingsErrors[flow.error]}
        </Text>
      ) : null}
      <ConfirmItsYouDialog
        isPresented={flow.needsReauth}
        onDismiss={flow.cancelReauth}
        onConfirmed={flow.retryAfterReauth}
      />
      <StatusSheet
        isPresented={flow.purgeAt !== null}
        tone="info"
        title={copy.done}
        message={copy.doneBody(purgeDate)}
        actionLabel={settingsCopy.ok}
        onAction={() => void signOut()}
        onDismiss={() => void signOut()}
      />
    </SettingsFrame>
  );
}
