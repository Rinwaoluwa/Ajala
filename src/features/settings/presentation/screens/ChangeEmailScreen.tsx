import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { Button, OtpInput, StatusSheet, Text, TextField, TextLink } from '@shared/components';

import { isEmailLike } from '../../domain/rules/settingsRules';
import { ConfirmItsYouDialog } from '../components/ConfirmItsYouDialog';
import { SettingsFrame } from '../components/SettingsFrame';
import { settingsCopy, settingsErrors } from '../copy';
import { useChangeEmail } from '../hooks/useAccountFlows';

/**
 * Change email (API map §10): the new address (`POST /me/email/change`; asks
 * "Confirm it's you" first when the server wants it), then the 6-digit code sent
 * to it (`/confirm`). The code is checked as soon as the last digit lands.
 */
export function ChangeEmailScreen({ onBack }: { onBack: () => void }) {
  const copy = settingsCopy.email;
  const flow = useChangeEmail();
  const [email, setEmail] = useState('');
  const change = useCallback((t: string) => setEmail(t), []);

  return (
    <SettingsFrame
      title={copy.title}
      onBack={onBack}
      footer={
        flow.sentTo ? null : (
          <Button
            label={copy.send}
            size="lg"
            fullWidth
            disabled={!isEmailLike(email)}
            loading={flow.sending}
            onPress={() => flow.send(email)}
          />
        )
      }
    >
      {flow.sentTo ? (
        <View style={{ gap: 20 }}>
          <Text variant="bodyMd" tone="muted">
            {copy.codeIntro(flow.sentTo)}
          </Text>
          <OtpInput
            autoFocus
            onComplete={(code) => flow.confirm(code)}
            error={flow.confirmError ? settingsErrors[flow.confirmError] : null}
          />
          {flow.confirming ? (
            <Text variant="bodySm" tone="muted">
              {settingsCopy.edit.usernameChecking}
            </Text>
          ) : null}
          <TextLink label={settingsCopy.retry} onPress={flow.restart} emphasis="plain" />
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          <Text variant="bodySm" tone="muted">
            {copy.intro}
          </Text>
          <TextField
            label={copy.newEmail}
            onChangeText={change}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            error={flow.sendError ? settingsErrors[flow.sendError] : null}
          />
        </View>
      )}
      <ConfirmItsYouDialog
        isPresented={flow.needsReauth}
        onDismiss={flow.cancelReauth}
        onConfirmed={flow.retryAfterReauth}
      />
      <StatusSheet
        isPresented={flow.done}
        tone="success"
        title={copy.done}
        message={copy.doneBody}
        actionLabel={settingsCopy.ok}
        onAction={onBack}
        onDismiss={onBack}
      />
    </SettingsFrame>
  );
}
