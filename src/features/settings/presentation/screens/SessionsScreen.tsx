import { Alert, View } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';

import { Button, EmptyState, SkeletonBlock, SkeletonPulse, Tag, Text } from '@shared/components';
import { useFontScale } from '@shared/hooks/useFontScale';
import { useTheme } from '@shared/hooks/useTheme';

import { LoadFailed } from '../components/LoadFailed';
import { SettingsFrame } from '../components/SettingsFrame';
import { settingsCopy, settingsErrors } from '../copy';
import { useSessions } from '../hooks/useSettingsData';

/**
 * Sign-in activity (`GET /me/sessions`): this device first, marked, then every
 * other device with where and when it was last used, and Sign out
 * (`DELETE /me/sessions/:id`) after a confirmation. This device has no Sign out
 * here — Log out in Settings does that (spec §2.6).
 */
const when = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export function SessionsScreen({ onBack }: { onBack: () => void }) {
  const theme = useTheme();
  const stacked = useFontScale() > 1.3;
  const copy = settingsCopy.sessions;
  const sessions = useSessions();

  const confirm = (id: string) =>
    Alert.alert(copy.signOutTitle, copy.signOutBody, [
      { text: settingsCopy.hub.cancel, style: 'cancel' },
      { text: copy.signOut, style: 'destructive', onPress: () => sessions.end(id) },
    ]);

  return (
    <SettingsFrame title={copy.title} onBack={onBack}>
      {sessions.failed ? (
        <LoadFailed onRetry={sessions.retry} />
      ) : !sessions.sessions ? (
        <SkeletonPulse>
          <View style={{ gap: 12 }}>
            {[0, 1].map((i) => (
              <SkeletonBlock key={i} height={72} radius={14} />
            ))}
          </View>
        </SkeletonPulse>
      ) : (
        <View style={{ gap: 12 }}>
          {sessions.sessions.map((s) => (
            <Animated.View
              key={s.id}
              exiting={FadeOut.duration(160)}
              layout={LinearTransition.duration(200)}
              style={{
                // At large text "Sign out" goes under the device instead of squeezing its name.
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
              <View style={stacked ? { alignSelf: 'stretch', gap: 4 } : { flex: 1, gap: 4 }}>
                <Text variant="bodyMd">{s.deviceName ?? copy.unknownDevice}</Text>
                <Text variant="bodySm" tone="muted">
                  {[s.country, copy.lastActive(when(s.lastUsedAt))].filter(Boolean).join(' · ')}
                </Text>
                {s.current ? <Tag label={copy.thisDevice} tone="success" /> : null}
              </View>
              {s.current ? null : (
                <Button
                  label={copy.signOut}
                  variant="secondary"
                  size="sm"
                  loading={sessions.ending === s.id}
                  onPress={() => confirm(s.id)}
                />
              )}
            </Animated.View>
          ))}
          {sessions.sessions.every((s) => s.current) ? <EmptyState title={copy.empty} /> : null}
        </View>
      )}
      {sessions.error ? (
        <Text variant="bodySm" tone="destructive" accessibilityLiveRegion="polite">
          {settingsErrors[sessions.error]}
        </Text>
      ) : null}
    </SettingsFrame>
  );
}
