import Ionicons from '@expo/vector-icons/Ionicons';
import { FlatList, RefreshControl, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CenteredHeader,
  EmptyState,
  GlassSurface,
  LoadingRing,
  PillTabs,
  Screen,
  SkeletonBlock,
  SkeletonPulse,
  VectorIcon,
  useListEntrance,
} from '@shared/components';
import { useLiquidGlass } from '@shared/hooks/useLiquidGlass';
import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER } from '@shared/theme';

import type { AppNotification, NotificationFilter } from '../../domain/entities/Notification';
import { targetOf } from '../../domain/rules/notificationRules';
import { NotificationRow } from '../components/NotificationRow';
import { notificationsCopy as copy } from '../copy';
import { useNotifications } from '../hooks/useNotifications';

/**
 * Notifications (Figma, opened from the home bell): the centred title with a
 * round back button, All / Unread, then the inbox, newest first (spec §2.17).
 *
 * All and Unread are filtered by the server. Tapping a row marks it read and
 * opens what it is about: the post or the Travel paywall. Chat messages are
 * not listed here (they are push only; Messages has its own badge).
 * While anything is unread, a round button at the header's right marks it all
 * read; nothing is marked read just by opening the screen.
 */
const FILTERS: readonly { value: NotificationFilter; label: string }[] = [
  { value: 'all', label: copy.all },
  { value: 'unread', label: copy.unread },
];

/** The header's round buttons are 40pt, as `CenteredHeader` draws its back button. */
const BUTTON = 40;

export type NotificationsScreenProps = {
  onBack: () => void;
  onOpenPost: (postId: string) => void;
  /** A subscription notice: the Travel paywall. */
  onOpenPaywall: () => void;
};

export function NotificationsScreen({ onBack, onOpenPost, onOpenPaywall }: NotificationsScreenProps) {
  const theme = useTheme();
  const glass = useLiquidGlass();
  const insets = useSafeAreaInsets();
  const vm = useNotifications();
  const enter = useListEntrance(vm.items.length > 0);

  const open = (n: AppNotification) => {
    vm.markRead(n);
    const target = targetOf(n);
    if (target?.to === 'post') onOpenPost(target.postId);
    else if (target?.to === 'paywall') onOpenPaywall();
  };

  const markAll =
    vm.unreadCount > 0 ? (
      <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(160)}>
        <TouchableOpacity
          activeOpacity={0.6}
          onPress={vm.markAllRead}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={copy.markAllRead}
        >
          <GlassSurface
            fallbackColor={theme.selectedFill}
            interactive
            shadow={false}
            onPlainPage
            style={{
              width: BUTTON,
              height: BUTTON,
              borderRadius: BUTTON / 2,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons
              name="checkmark-done"
              size={20}
              color={glass ? theme.foreground : theme.selectedForeground}
            />
          </GlassSurface>
        </TouchableOpacity>
      </Animated.View>
    ) : undefined;

  return (
    <Screen edges={['top']} padded={false}>
      <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingVertical: 8 }}>
        <CenteredHeader title={copy.title} onBack={onBack} trailing={markAll} />
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
          data={vm.items}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{
            paddingHorizontal: SCREEN_GUTTER,
            paddingBottom: Math.max(insets.bottom, 16) + 16,
            flexGrow: 1,
          }}
          onEndReached={vm.loadMore}
          onEndReachedThreshold={0.6}
          refreshControl={
            <RefreshControl refreshing={vm.refreshing} onRefresh={vm.refresh} tintColor={theme.primary} />
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={enter(index, 8, 40)}>
              <NotificationRow item={item} onPress={() => open(item)} />
            </Animated.View>
          )}
          ListFooterComponent={
            vm.loadingMore ? (
              <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                <LoadingRing size={28} accessibilityLabel={copy.loadingMore} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            vm.failed ? (
              <EmptyState
                title={copy.failed}
                action={{
                  label: copy.retry,
                  onPress: vm.retry,
                  variant: 'primary',
                }}
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
                      <VectorIcon name="bell" size={36} color={theme.selectedForeground} />
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
