import { Alert, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { Button, NoteCard, SkeletonBlock, SkeletonPulse, Tag, Text } from '@shared/components';
import { useFontScale } from '@shared/hooks/useFontScale';
import { useTheme } from '@shared/hooks/useTheme';

import type { IdentityProvider, LinkedProvider } from '../../domain/entities/Settings';
import { ConfirmItsYouDialog } from '../components/ConfirmItsYouDialog';
import { LoadFailed } from '../components/LoadFailed';
import { SettingsFrame } from '../components/SettingsFrame';
import { settingsCopy, settingsErrors } from '../copy';
import { useUnlinkIdentity } from '../hooks/useAccountFlows';
import { useAccount } from '../hooks/useSettingsData';
import type { SettingsDestination } from '../navigation/routes';

/**
 * Connected accounts: the ways this account signs in (`identities` on `GET /me`).
 * Another is connected by signing in with it.
 *
 * Google and Apple can be unlinked (`DELETE /me/identities/{provider}`) after a
 * confirmation and, when the server asks, "Confirm it's you". The last way in
 * cannot go (409 LAST_SIGN_IN_METHOD): the screen then offers to set a password
 * first. Email and password is not unlinkable.
 */
export function ConnectedAccountsScreen({
  onBack,
  onNavigate,
}: {
  onBack: () => void;
  onNavigate: (to: SettingsDestination) => void;
}) {
  const theme = useTheme();
  const stacked = useFontScale() > 1.3;
  const copy = settingsCopy.connected;
  const account = useAccount();
  const flow = useUnlinkIdentity();
  const names: Record<IdentityProvider, string> = {
    email: copy.email,
    google: copy.google,
    apple: copy.apple,
  };

  const confirm = (provider: LinkedProvider) =>
    Alert.alert(copy.unlinkTitle(names[provider]), copy.unlinkBody(names[provider]), [
      { text: settingsCopy.hub.cancel, style: 'cancel' },
      { text: copy.unlink, style: 'destructive', onPress: () => flow.unlink(provider) },
    ]);

  return (
    <SettingsFrame title={copy.title} onBack={onBack}>
      <Text variant="bodySm" tone="muted">
        {copy.intro}
      </Text>
      {account.isError && !account.data ? (
        <LoadFailed onRetry={() => void account.refetch()} />
      ) : !account.data ? (
        <SkeletonPulse>
          <SkeletonBlock height={120} radius={16} />
        </SkeletonPulse>
      ) : (
        <View style={{ gap: 12 }}>
          {account.data.identities.map((i) => (
            <Animated.View
              key={i.provider}
              exiting={FadeOut.duration(160)}
              layout={LinearTransition.duration(200)}
              style={{
                // At large text the button goes under the name instead of squeezing it.
                flexDirection: stacked ? 'column' : 'row',
                alignItems: stacked ? 'flex-start' : 'center',
                gap: 12,
                padding: 16,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.card,
              }}
            >
              <View style={stacked ? { alignSelf: 'stretch', gap: 6 } : { flex: 1, gap: 6 }}>
                <Text variant="bodyMd">{names[i.provider]}</Text>
                <Tag label={copy.connectedStatus} tone="success" />
              </View>
              {i.provider === 'email' ? null : (
                <Button
                  label={copy.unlink}
                  variant="secondary"
                  size="sm"
                  loading={flow.unlinking === i.provider}
                  onPress={() => confirm(i.provider as LinkedProvider)}
                />
              )}
            </Animated.View>
          ))}
        </View>
      )}

      {flow.error === 'lastSignInMethod' ? (
        <Animated.View entering={FadeIn.duration(180)} style={{ gap: 12 }}>
          <NoteCard title={copy.lastMethodTitle} body={copy.lastMethodBody} />
          <View style={{ alignSelf: 'flex-start' }}>
            <Button
              label={copy.setPassword}
              onPress={() => {
                flow.dismissError();
                onNavigate('changePassword');
              }}
            />
          </View>
        </Animated.View>
      ) : flow.error ? (
        <Text variant="bodySm" tone="destructive" accessibilityLiveRegion="polite">
          {settingsErrors[flow.error]}
        </Text>
      ) : flow.unlinked ? (
        <Text variant="bodySm" tone="muted" accessibilityLiveRegion="polite">
          {copy.unlinked(names[flow.unlinked])}
        </Text>
      ) : null}

      <NoteCard title={copy.title} body={copy.note} />
      <ConfirmItsYouDialog
        isPresented={flow.needsReauth}
        onDismiss={flow.cancelReauth}
        onConfirmed={flow.retryAfterReauth}
      />
    </SettingsFrame>
  );
}
