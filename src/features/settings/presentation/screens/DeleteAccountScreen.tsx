import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { useSignOut } from '@features/auth';
import { Button, Text, TextArea } from '@shared/components';

import { DELETE_REASON_MAX } from '../../domain/rules/settingsRules';
import { ConfirmItsYouDialog } from '../components/ConfirmItsYouDialog';
import { SettingsFrame } from '../components/SettingsFrame';
import { settingsCopy, settingsErrors } from '../copy';
import { useDeleteAccount } from '../hooks/useAccountFlows';
import { haptics } from '@shared/feedback/haptics';

/**
 * Delete account (`DELETE /me`): what happens (14 days' grace, every device
 * signed out), an optional reason, then a confirmation. When the server asks,
 * "Confirm it's you" comes first. Once scheduled, this phone signs out and an
 * alert gives the date it will be erased, over the sign-in screen. An alert, not
 * a sheet: the sign-out unmounts this screen at once (the deletion signs out
 * every device), and a sheet opened here was left as a blank white screen.
 */
export function DeleteAccountScreen({ onBack }: { onBack: () => void }) {
  const copy = settingsCopy.remove;
  const signOut = useSignOut();
  const flow = useDeleteAccount({
    onScheduled: (purgeAt) => {
      const date = purgeAt
        ? new Date(purgeAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
        : '';
      haptics.success();
      Alert.alert(copy.done, copy.doneBody(date), [{ text: settingsCopy.ok }]);
      void signOut();
    },
  });
  const [reason, setReason] = useState('');
  const change = useCallback((t: string) => setReason(t), []);

  const confirm = () => {
    haptics.warning();
    Alert.alert(copy.confirmTitle, copy.confirmBody, [
      { text: settingsCopy.hub.cancel, style: 'cancel' },
      { text: copy.confirm, style: 'destructive', onPress: () => flow.submit(reason) },
    ]);
  };

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
    </SettingsFrame>
  );
}
