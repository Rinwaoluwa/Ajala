import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { Button, PasswordField, PasswordRules, StatusSheet, Text } from '@shared/components';

import { isPasswordValid, passwordChecks } from '../../domain/rules/settingsRules';
import { SettingsFrame } from '../components/SettingsFrame';
import { settingsCopy, settingsErrors } from '../copy';
import { useChangePassword } from '../hooks/useAccountFlows';

/**
 * Change password (`POST /me/password`): the current password, a new one with
 * its rules ticking off as they are met, then Update. Every other device is
 * signed out; a sheet says so.
 */
export function ChangePasswordScreen({ onBack }: { onBack: () => void }) {
  const copy = settingsCopy.password;
  const flow = useChangePassword();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const checks = passwordChecks(next);
  const { reset } = flow;
  const changeCurrent = useCallback(
    (t: string) => {
      setCurrent(t);
      reset();
    },
    [reset],
  );
  const changeNext = useCallback((t: string) => setNext(t), []);

  return (
    <SettingsFrame
      title={copy.title}
      onBack={onBack}
      footer={
        <Button
          label={copy.save}
          size="lg"
          fullWidth
          disabled={!current || !isPasswordValid(next)}
          loading={flow.saving}
          onPress={() => flow.submit(current, next)}
        />
      }
    >
      <View style={{ gap: 20 }}>
        <PasswordField
          label={copy.current}
          onChangeText={changeCurrent}
          autoComplete="current-password"
          error={flow.error === 'wrongPassword' ? settingsErrors.wrongPassword : null}
        />
        <View>
          <PasswordField
            label={copy.next}
            onChangeText={changeNext}
            error={flow.error === 'passwordBreached' ? settingsErrors.passwordBreached : null}
          />
          <PasswordRules
            rules={[
              { id: 'length', label: copy.rules.length, met: checks.length },
              { id: 'upper', label: copy.rules.upper, met: checks.upper },
              { id: 'digit', label: copy.rules.digit, met: checks.digit },
            ]}
          />
        </View>
        {flow.error && flow.error !== 'wrongPassword' && flow.error !== 'passwordBreached' ? (
          <Text variant="bodySm" tone="destructive" accessibilityLiveRegion="polite">
            {settingsErrors[flow.error]}
          </Text>
        ) : null}
      </View>
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
