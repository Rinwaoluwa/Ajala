import { FlatList, RefreshControl, View } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CenteredHeader,
  EmptyState,
  LoadingRing,
  PillTabs,
  PostCard,
  Screen,
  enterRise,
} from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER } from '@shared/theme';

import type { SavedFilter } from '../../domain/entities/PublicProfile';
import { useSavedActivities } from '../hooks/useSavedActivities';
import { profileViewCopy } from '../profileViewCopy';

/**
 * "Saved activities" (Figma): the posts the person bookmarked, newest save
 * first (`GET /me/saved?type=`), with the type pills — each pill is its own
 * list from the server, not a filter over one page. More loads as it scrolls;
 * pull to refresh asks again.
 *
 * Tapping the bookmark on a card unsaves it (the shared `useSavePost`): the
 * bookmark empties at once, and the card folds away when the list refreshes
 * behind it.
 */

const FILTERS: { value: SavedFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'meetup', label: 'Meetups' },
  { value: 'event', label: 'Events' },
  { value: 'plan', label: 'Plans' },
  { value: 'group', label: 'Groups' },
];

export function SavedActivitiesScreen({
  onBack,
  onOpenPost,
  onExplore,
}: {
  onBack: () => void;
  onOpenPost: (postId: string) => void;
  onExplore: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const vm = useSavedActivities();
  const copy = profileViewCopy.saved;

  const empty = vm.loading ? (
    <View className="flex-1 items-center justify-center">
      <LoadingRing size={48} accessibilityLabel="Loading saved activities" />
    </View>
  ) : vm.failed ? (
    <View className="flex-1 justify-center">
      <EmptyState title={copy.failed} action={{ label: copy.retry, onPress: vm.retry, variant: 'primary' }} />
    </View>
  ) : (
    <View className="flex-1 justify-center">
      <EmptyState
        title={vm.filter === 'all' ? copy.emptyTitle : copy.emptyFiltered}
        body={vm.filter === 'all' ? copy.emptyBody : undefined}
        action={{ label: copy.explore, onPress: onExplore }}
      />
    </View>
  );

  return (
    <Screen edges={['top']} padded={false}>
      <View className="px-20 pt-8">
        <CenteredHeader title={copy.title} onBack={onBack} />
      </View>
      <View className="mt-16">
        <PillTabs options={FILTERS} value={vm.filter} onChange={vm.setFilter} />
      </View>
      <FlatList
        data={vm.items}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{
          padding: SCREEN_GUTTER,
          paddingBottom: insets.bottom + 32,
          gap: 20,
          flexGrow: 1,
        }}
        refreshControl={
          <RefreshControl refreshing={vm.refreshing} onRefresh={vm.refresh} tintColor={theme.primary} />
        }
        onEndReached={vm.loadMore}
        onEndReachedThreshold={0.5}
        renderItem={({ item, index }) => (
          <Animated.View
            entering={index < 3 ? enterRise(index * 60) : undefined}
            exiting={FadeOut.duration(180)}
            layout={LinearTransition.duration(220)}
          >
            <PostCard post={item} onPress={() => onOpenPost(item.id)} />
          </Animated.View>
        )}
        ListEmptyComponent={empty}
        ListFooterComponent={
          vm.loadingMore ? (
            <View className="items-center py-16">
              <LoadingRing size={28} accessibilityLabel="Loading more" />
            </View>
          ) : null
        }
      />
    </Screen>
  );
}
