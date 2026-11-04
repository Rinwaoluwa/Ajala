import Ionicons from '@expo/vector-icons/Ionicons';
import { FlatList, RefreshControl, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CenteredHeader,
  EmptyState,
  PillTabs,
  Screen,
  SkeletonBlock,
  SkeletonPulse,
  enterRise,
} from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER } from '@shared/theme';

import type { NotificationFilter } from '../../domain/entities/Notification';
import { NotificationRow } from '../components/NotificationRow';
import { useNotifications } from '../hooks/useNotifications';

/**
 * Notifications (Figma, opened from the home bell): the centred title with a
 * round back button, All / Unread, then the list, newest first.
 *
 * There is no notifications API yet (only pushes, API map §11), so today this
 * shows its empty state; the list drops in when an endpoint exists (README).
 */
const FILTERS: readonly { value: NotificationFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
];

const copy = {
  title: 'Notifications',
  emptyAll: 'You’re all caught up',
  emptyAllBody: 'Updates about your requests, activities and messages will show up here.',
  emptyUnread: 'No unread notifications',
  emptyUnreadBody: 'You’ve seen everything new.',
  failed: 'Notifications didn’t load.',
  retry: 'Try again',
};

export type NotificationsScreenProps = {
  onBack: () => void;
  onOpenPost: (postId: string) => void;
};

export function NotificationsScreen({ onBack, onOpenPost }: NotificationsScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const vm = useNotifications();

  return (
    <Screen edges={['top']} padded={false}>
      <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingVertical: 8 }}>
        <CenteredHeader title={copy.title} onBack={onBack} />
      </View>
      <View style={{ paddingVertical: 12 }}>
        <PillTabs options={FILTERS} value={vm.filter} onChange={vm.setFilter} />
      </View>
      {vm.loading ? (
        <SkeletonPulse>
          <View style={{ padding: SCREEN_GUTTER, gap: 18 }}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 14 }}>
                <SkeletonBlock width={52} height={52} radius={16} />
                <View style={{ flex: 1, gap: 6 }}>
                  <SkeletonBlock width="60%" height={16} />
                  <SkeletonBlock width="90%" height={12} />
                </View>
              </View>
            ))}
          </View>
        </SkeletonPulse>
      ) : (
        <FlatList
          data={vm.items ?? []}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{
            paddingHorizontal: SCREEN_GUTTER,
            paddingBottom: Math.max(insets.bottom, 16) + 16,
            flexGrow: 1,
          }}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={vm.refresh} tintColor={theme.primary} />
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={index < 8 ? enterRise(index * 40) : undefined}>
              <NotificationRow
                item={item}
                onPress={item.postId ? () => onOpenPost(item.postId as string) : undefined}
              />
            </Animated.View>
          )}
          ListEmptyComponent={
            vm.failed ? (
              <EmptyState
                title={copy.failed}
                action={{ label: copy.retry, onPress: vm.retry, variant: 'primary' }}
              />
            ) : (
              <View style={{ flex: 1, justifyContent: 'center' }}>
                <EmptyState
                  art={
                    <View
                      style={{
                        width: 88,
                        height: 88,
                        borderRadius: 24,
                        backgroundColor: theme.selectedFill,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="notifications-outline" size={36} color={theme.selectedForeground} />
                    </View>
                  }
                  title={vm.filter === 'all' ? copy.emptyAll : copy.emptyUnread}
                  body={vm.filter === 'all' ? copy.emptyAllBody : copy.emptyUnreadBody}
                />
              </View>
            )
          }
        />
      )}
    </Screen>
  );
}
