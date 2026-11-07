import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import {
  Button,
  Dialog,
  OtpInput,
  PasswordField,
  Text,
  TextLink,
  type OtpInputHandle,
} from '@shared/components';

import { settingsCopy, settingsErrors } from '../copy';
import { useReauth } from '../hooks/useAccountFlows';

/**
 * "Confirm it's you" (spec §2.5): asked when a sensitive call answers 403
 * REAUTH_REQUIRED — changing email, setting a first password, unlinking Google
 * or Apple, exporting data, deleting the account. It opens a five-minute window
 * (`POST /me/reauth`); `onConfirmed` then retries the call.
 *
 * An account with a password types it. A Google- or Apple-only account has no
 * password, so opening the dialog emails a code (`POST /me/reauth/code`) and the
 * six digits are sent as soon as the last one lands.
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
  const copy = settingsCopy.reauth;
  const reauth = useReauth();
  const { mode, sendCode, reset } = reauth;

  // A code is emailed each time the dialog opens for a code account, and the
  // last attempt's errors are cleared, so reopening starts clean.
  useEffect(() => {
    if (!isPresented) return;
    reset();
    if (mode === 'code') sendCode();
    // Only on opening: `sendCode` and `reset` are new functions each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresented, mode]);

  return (
    <Dialog isPresented={isPresented} onDismiss={onDismiss} accessibilityLabel={copy.title}>
      <View style={{ gap: 16 }}>
        <Text variant="headingMd" accessibilityRole="header">
          {copy.title}
        </Text>
        {mode === 'password' ? (
          <PasswordStep reauth={reauth} onDismiss={onDismiss} onConfirmed={onConfirmed} />
        ) : (
          <CodeStep reauth={reauth} onDismiss={onDismiss} onConfirmed={onConfirmed} />
        )}
      </View>
    </Dialog>
  );
}

type StepProps = { reauth: ReturnType<typeof useReauth>; onDismiss: () => void; onConfirmed: () => void };

function PasswordStep({ reauth, onDismiss, onConfirmed }: StepProps) {
  const copy = settingsCopy.reauth;
  const [password, setPassword] = useState('');
  const { clearError } = reauth;
  const change = useCallback(
    (text: string) => {
      setPassword(text);
      clearError();
    },
    [clearError],
  );

  return (
    <>
      <Text variant="bodySm" tone="muted">
        {copy.body}
      </Text>
      <PasswordField
        label={copy.password}
        onChangeText={change}
        autoComplete="current-password"
        error={reauth.confirmError ? settingsErrors[reauth.confirmError] : null}
        autoFocus
      />
      <Actions
        onDismiss={onDismiss}
        confirm={{
          disabled: !password,
          loading: reauth.confirming,
          onPress: () => reauth.confirm({ password }, onConfirmed),
        }}
      />
    </>
  );
}

function CodeStep({ reauth, onDismiss, onConfirmed }: StepProps) {
  const copy = settingsCopy.reauth;
  const otp = useRef<OtpInputHandle>(null);
  const error = reauth.sendError ?? reauth.confirmError;

  // A wrong code is cleared so the next one can be typed straight in.
  useEffect(() => {
    if (reauth.confirmError) otp.current?.clear();
  }, [reauth.confirmError]);

  return (
    <>
      <Text variant="bodySm" tone="muted" accessibilityLiveRegion="polite">
        {reauth.sending ? copy.sending : copy.codeBody(reauth.email)}
      </Text>
      <OtpInput
        ref={otp}
        autoFocus
        // Typing again clears the last error; clearing the boxes after a wrong code
        // (which reports an empty code) leaves it showing.
        onChange={(code) => {
          if (code) reauth.clearError();
        }}
        onComplete={(code) => reauth.confirm({ code }, onConfirmed)}
        error={error ? settingsErrors[error] : null}
      />
      {reauth.confirming ? (
        <Text variant="bodySm" tone="muted">
          {copy.checking}
        </Text>
      ) : (
        <View style={{ alignSelf: 'flex-start' }}>
          <TextLink
            label={copy.resend}
            emphasis="plain"
            onPress={() => {
              otp.current?.clear();
              reauth.reset();
              reauth.sendCode();
            }}
          />
        </View>
      )}
      <Actions onDismiss={onDismiss} />
    </>
  );
}

/** Cancel, and Continue when there is something to submit (a code submits itself). */
function Actions({
  onDismiss,
  confirm,
}: {
  onDismiss: () => void;
  confirm?: { disabled: boolean; loading: boolean; onPress: () => void };
}) {
  const copy = settingsCopy.reauth;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      <View style={{ flexGrow: 1, flexBasis: 120 }}>
        <Button label={copy.cancel} variant="secondary" onPress={onDismiss} fullWidth />
      </View>
      {confirm ? (
        <View style={{ flexGrow: 1, flexBasis: 120 }}>
          <Button
            label={copy.confirm}
            onPress={confirm.onPress}
            disabled={confirm.disabled}
            loading={confirm.loading}
            fullWidth
          />
        </View>
      ) : null}
    </View>
  );
}
