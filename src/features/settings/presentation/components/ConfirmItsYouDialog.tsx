import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { Button, Dialog, PasswordField, Text } from '@shared/components';

import { isSettingsError } from '../../domain/entities/SettingsError';
import { settingsCopy, settingsErrors } from '../copy';
import { useSettingsUseCases } from '../state/useSettingsUseCases';

/**
 * "Confirm it's you" (spec §2.5): asked when a sensitive call answers 403
 * REAUTH_REQUIRED — changing email, deleting the account. The password opens a
 * five-minute window (`POST /me/reauth`); `onConfirmed` then retries the call.
 *
 * Google- and Apple-only accounts have no password; their emailed-code route is
 * not drawn yet and is flagged in the README.
 */
export function ConfirmItsYouDialog({
  isPresented,
  onDismiss,
  onConfirmed,
}: {
  isPresented: boolean;
  onDismiss: () => void;
  onConfirmed: () => void;
}) {
  const { reauthenticate } = useSettingsUseCases();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const change = useCallback((text: string) => {
    setPassword(text);
    setError(null);
  }, []);

  const confirm = async () => {
    setBusy(true);
    try {
      await reauthenticate(password);
      setPassword('');
      onConfirmed();
    } catch (e) {
      setError(settingsErrors[isSettingsError(e) ? e.code : 'unknown']);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog isPresented={isPresented} onDismiss={onDismiss} accessibilityLabel={settingsCopy.reauth.title}>
      <View style={{ gap: 16 }}>
        <View style={{ gap: 4 }}>
          <Text variant="headingMd" accessibilityRole="header">
            {settingsCopy.reauth.title}
          </Text>
          <Text variant="bodySm" tone="muted">
            {settingsCopy.reauth.body}
          </Text>
        </View>
        <PasswordField
          label={settingsCopy.reauth.password}
          onChangeText={change}
          autoComplete="current-password"
          error={error}
          autoFocus
        />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Button label={settingsCopy.reauth.cancel} variant="secondary" onPress={onDismiss} fullWidth />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label={settingsCopy.reauth.confirm}
              onPress={() => void confirm()}
              disabled={!password}
              loading={busy}
              fullWidth
            />
          </View>
        </View>
      </View>
    </Dialog>
  );
}
