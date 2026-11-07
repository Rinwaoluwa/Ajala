import { useCallback, useState } from 'react';
import { View } from 'react-native';

import {
  Button,
  PasswordField,
  PasswordRules,
  SkeletonBlock,
  SkeletonPulse,
  StatusSheet,
  Text,
} from '@shared/components';

import type { Account } from '../../domain/entities/Settings';
import { hasPassword, isPasswordValid, passwordChecks } from '../../domain/rules/settingsRules';
import { ConfirmItsYouDialog } from '../components/ConfirmItsYouDialog';
import { LoadFailed } from '../components/LoadFailed';
import { SettingsFrame } from '../components/SettingsFrame';
import { settingsCopy, settingsErrors } from '../copy';
import { useChangePassword, useSetPassword } from '../hooks/useAccountFlows';
import { useAccount } from '../hooks/useSettingsData';

/**
 * Change password, or set a first one.
 *
 * An account that signs in with a password changes it (`POST /me/password`):
 * the current password, a new one with its rules ticking off as they are met,
 * then Update. Every other device is signed out; a sheet says so.
 *
 * A Google- or Apple-only account has no current password, so it sets one
 * (`POST /me/password/set`) after "Confirm it's you" (an emailed code). That is
 * also what lets it unlink its last provider later.
 */
export function ChangePasswordScreen({ onBack }: { onBack: () => void }) {
  const account = useAccount();
  // Which form is settled once, when the account first loads: setting a password
  // rereads the account, and switching forms then would take the success sheet
  // away before it could be read.
  const modeOf = (a: Account) => (hasPassword(a) ? 'change' : 'set');
  const [mode, setMode] = useState<'change' | 'set' | null>(() =>
    account.data ? modeOf(account.data) : null,
  );
  if (mode === null && account.data) setMode(modeOf(account.data));

  const title = mode === 'set' ? settingsCopy.password.setTitle : settingsCopy.password.title;
  if (account.isError && !account.data) {
    return (
      <SettingsFrame title={title} onBack={onBack}>
        <LoadFailed onRetry={() => void account.refetch()} />
      </SettingsFrame>
    );
  }
  if (!account.data || mode === null) {
    return (
      <SettingsFrame title={title} onBack={onBack}>
        <SkeletonPulse>
          <View style={{ gap: 20 }}>
            <SkeletonBlock height={58} radius={8} />
            <SkeletonBlock height={58} radius={8} />
          </View>
        </SkeletonPulse>
      </SettingsFrame>
    );
  }
  return mode === 'change' ? (
    <ChangeForm onBack={onBack} />
  ) : (
    <SetForm account={account.data} onBack={onBack} />
  );
}

function ChangeForm({ onBack }: { onBack: () => void }) {
  const copy = settingsCopy.password;
  const flow = useChangePassword();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
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
        <NewPassword value={next} onChange={changeNext} breached={flow.error === 'passwordBreached'} />
        <OtherError code={flow.error} />
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

function SetForm({ account, onBack }: { account: Account; onBack: () => void }) {
  const copy = settingsCopy.password;
  const flow = useSetPassword();
  const [next, setNext] = useState('');
  const { reset } = flow;
  const changeNext = useCallback(
    (t: string) => {
      setNext(t);
      reset();
    },
    [reset],
  );

  return (
    <SettingsFrame
      title={copy.setTitle}
      onBack={onBack}
      footer={
        <Button
          label={copy.setSave}
          size="lg"
          fullWidth
          disabled={!isPasswordValid(next)}
          loading={flow.saving}
          onPress={() => flow.submit(next)}
        />
      }
    >
      <View style={{ gap: 20 }}>
        <Text variant="bodySm" tone="muted">
          {copy.setIntro(account.email)}
        </Text>
        <NewPassword value={next} onChange={changeNext} breached={flow.error === 'passwordBreached'} />
        <OtherError code={flow.error} />
      </View>
      <ConfirmItsYouDialog
        isPresented={flow.needsReauth}
        onDismiss={flow.cancelReauth}
        onConfirmed={flow.retryAfterReauth}
      />
      <StatusSheet
        isPresented={flow.done}
        tone="success"
        title={copy.setDone}
        message={copy.setDoneBody}
        actionLabel={settingsCopy.ok}
        onAction={onBack}
        onDismiss={onBack}
      />
    </SettingsFrame>
  );
}

function NewPassword({
  value,
  onChange,
  breached,
}: {
  value: string;
  onChange: (text: string) => void;
  breached: boolean;
}) {
  const copy = settingsCopy.password;
  const checks = passwordChecks(value);
  return (
    <View>
      <PasswordField
        label={copy.next}
        onChangeText={onChange}
        error={breached ? settingsErrors.passwordBreached : null}
      />
      <PasswordRules
        rules={[
          { id: 'length', label: copy.rules.length, met: checks.length },
          { id: 'upper', label: copy.rules.upper, met: checks.upper },
          { id: 'digit', label: copy.rules.digit, met: checks.digit },
        ]}
      />
    </View>
  );
}

/** Anything not shown on a field: no verified email, already has a password, offline… */
function OtherError({ code }: { code: keyof typeof settingsErrors | null }) {
  if (!code || code === 'wrongPassword' || code === 'passwordBreached') return null;
  return (
    <Text variant="bodySm" tone="destructive" accessibilityLiveRegion="polite">
      {settingsErrors[code]}
    </Text>
  );
}
