import { Alert, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';

import { Avatar, Button, EmptyState, SkeletonBlock, SkeletonPulse, Text } from '@shared/components';
import { useFontScale } from '@shared/hooks/useFontScale';
import { useTheme } from '@shared/hooks/useTheme';

import { LoadFailed } from '../components/LoadFailed';
import { SettingsFrame } from '../components/SettingsFrame';
import { settingsCopy, settingsErrors } from '../copy';
import { useBlocked } from '../hooks/useSettingsData';

/**
 * Blocked accounts (`GET /me/blocks`): each person with Unblock, which asks
 * first (`DELETE /users/:id/block`). A row folds away when unblocked.
 */
export function BlockedAccountsScreen({ onBack }: { onBack: () => void }) {
  const theme = useTheme();
  const stacked = useFontScale() > 1.3;
  const copy = settingsCopy.blocked;
  const blocked = useBlocked();

  const confirm = (id: string, name: string) =>
    Alert.alert(copy.unblockTitle(name), copy.unblockBody, [
      { text: settingsCopy.hub.cancel, style: 'cancel' },
      { text: copy.unblock, onPress: () => blocked.unblock(id) },
    ]);

  return (
    <SettingsFrame title={copy.title} onBack={onBack}>
      {blocked.failed ? (
        <LoadFailed onRetry={blocked.retry} />
      ) : !blocked.blocked ? (
        <SkeletonPulse>
          <View style={{ gap: 12 }}>
            {[0, 1, 2].map((i) => (
              <SkeletonBlock key={i} height={56} radius={12} />
            ))}
          </View>
        </SkeletonPulse>
      ) : blocked.blocked.length === 0 ? (
        <EmptyState icon="ban-outline" title={copy.emptyTitle} body={copy.emptyBody} />
      ) : (
        <View style={{ gap: 4 }}>
          {blocked.blocked.map((person) => (
            <Animated.View
              key={person.id}
              exiting={FadeOut.duration(160)}
              style={{
                // At large text "Unblock" goes under the name (past the photo) instead of squeezing it.
                flexDirection: stacked ? 'column' : 'row',
                alignItems: stacked ? 'flex-start' : 'center',
                gap: stacked ? 8 : 12,
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  ...(stacked ? { alignSelf: 'stretch' as const } : { flex: 1 }),
                }}
              >
                <Avatar name={person.displayName} uri={person.avatarUrl} size={44} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMd">{person.displayName}</Text>
                  {person.handle ? (
                    <Text variant="bodySm" tone="muted">
                      @{person.handle}
                    </Text>
                  ) : null}
                </View>
              </View>
              <View style={stacked ? { marginLeft: 56 } : null}>
                <Button
                  label={copy.unblock}
                  variant="secondary"
                  size="sm"
                  loading={blocked.unblocking === person.id}
                  onPress={() => confirm(person.id, person.displayName)}
                />
              </View>
            </Animated.View>
          ))}
        </View>
      )}
      {blocked.error ? (
        <Text variant="bodySm" tone="destructive" accessibilityLiveRegion="polite">
          {settingsErrors[blocked.error]}
        </Text>
      ) : null}
    </SettingsFrame>
  );
}
