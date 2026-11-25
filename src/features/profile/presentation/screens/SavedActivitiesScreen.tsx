import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMyUserId } from '@features/auth';
import { RsvpNoticeDialog, useRsvpGate } from '@features/explore';
import {
  CenteredHeader,
  EmptyState,
  LoadingRing,
  PhotoViewer,
  PillTabs,
  PostListCardSkeleton,
  Screen,
  SkeletonPulse,
  useListEntrance,
  type MediaFrame,
} from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER } from '@shared/theme';

import type { ProfileActivity, SavedFilter } from '../../domain/entities/PublicProfile';
import { SavedPostCard } from '../components/SavedPostCard';
import { useSavedActivities } from '../hooks/useSavedActivities';
import { profileViewCopy } from '../profileViewCopy';

/**
 * "Saved activities": the posts the person bookmarked, newest save first
 * (`GET /me/saved?type=`), with the type pills — each pill is its own list
 * from the server, not a filter over one page. More loads as it scrolls; pull
 * to refresh asks again.
 *
 * A post is the card it is on Home (`SavedPostCard`, product 25 Nov): its
 * photos, the type's tag, the title, the price, when and where with Join, and
 * Comment and the bookmark at its foot. A photo opens full screen from where
 * it sits, and Join asks "Before you RSVP" the first time, both as on Home.
 *
 * The pills sit over a hairline, as Home's do, and the first card starts a
 * card's gap under it: the cards scroll under the line, where they used to be
 * cut off against the pills themselves.
 *
 * Tapping the bookmark on a card unsaves it (the shared `useSavePost`): the
 * bookmark empties at once, and the card fades away when the list refreshes
 * behind it.
 */

const FILTERS: { value: SavedFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'meetup', label: 'Meetups' },
  { value: 'event', label: 'Events' },
  { value: 'plan', label: 'Plans' },
  { value: 'group', label: 'Groups' },
];

/** Between one card and the next, and between the pills' hairline and the first: Home's. */
const CARD_GAP = 16;

export function SavedActivitiesScreen({
  onBack,
  onOpenPost,
  onOpenComments,
  onExplore,
}: {
  onBack: () => void;
  /** A locked post (MOB-077) comes with its reason: the paywall, not the post. */
  onOpenPost: (postId: string, lockReason?: 'plan' | 'distance' | null) => void;
  /** The comment button: the post, opened at its comments. */
  onOpenComments: (post: Pick<ProfileActivity, 'id' | 'title' | 'imageUrl' | 'type'>) => void;
  onExplore: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const vm = useSavedActivities();
  const enter = useListEntrance(vm.items.length > 0);
  const copy = profileViewCopy.saved;
  const myId = useMyUserId();
  // "Before you RSVP", once: a card's Join waits on the answer.
  const gate = useRsvpGate();

  const openPost = useCallback(
    (activity: ProfileActivity) => onOpenPost(activity.id, activity.lockReason),
    [onOpenPost],
  );
  // One viewer for the whole list: the tapped photo, and where it sits, to grow from.
  const [viewing, setViewing] = useState<{ activity: ProfileActivity; index: number; from: MediaFrame } | null>(null);
  const openPhoto = useCallback(
    (activity: ProfileActivity, index: number, from: MediaFrame) => setViewing({ activity, index, from }),
    [],
  );
  const viewed = useMemo(
    () =>
      viewing
        ? { full: viewing.activity.images.map((p) => p.full), cards: viewing.activity.images.map((p) => p.card) }
        : null,
    [viewing],
  );

  const empty = vm.loading ? (
    // Two cards in outline, laid out as real ones are, so nothing shifts when the posts land.
    <SkeletonPulse label={copy.loading}>
      <View style={{ gap: CARD_GAP }}>
        <PostListCardSkeleton photo footer />
        <PostListCardSkeleton footer />
      </View>
    </SkeletonPulse>
  ) : vm.failed ? (
    <View className="flex-1 justify-center">
      <EmptyState
        icon="cloud-offline-outline"
        title={copy.failed}
        action={{ label: copy.retry, onPress: vm.retry, variant: 'primary' }}
      />
    </View>
  ) : (
    <View className="flex-1 justify-center">
      <EmptyState
        icon="bookmark-outline"
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
      {/* The pills over a hairline, as on Home: the cards scroll under the line. */}
      <View className="mt-16">
        <PillTabs options={FILTERS} value={vm.filter} onChange={vm.setFilter} />
        <View className="mt-12" style={{ height: 1, backgroundColor: theme.border }} />
      </View>
      <FlatList
        data={vm.items}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: CARD_GAP,
          paddingBottom: insets.bottom + 32,
          gap: CARD_GAP,
          flexGrow: 1,
        }}
        refreshControl={
          <RefreshControl refreshing={vm.refreshing} onRefresh={vm.refresh} tintColor={theme.primary} />
        }
        onEndReached={vm.loadMore}
        onEndReachedThreshold={0.5}
        renderItem={({ item, index }) => (
          <Animated.View entering={enter(index)} exiting={FadeOut.duration(180)}>
            <SavedPostCard
              activity={item}
              mine={myId !== null && item.host.id === myId}
              onPress={openPost}
              onOpenComments={onOpenComments}
              onOpenPhoto={openPhoto}
              onBeforeRsvp={gate.beforeRsvp}
            />
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
      <RsvpNoticeDialog {...gate.dialog} />
      {/* The tapped photo grows from its place in the list (`origin`); the card-size copies
          already on screen are what grows, and hold each page until its full size has loaded. */}
      <PhotoViewer
        isPresented={viewing !== null}
        images={viewed?.full ?? []}
        previews={viewed?.cards}
        initialIndex={viewing?.index ?? 0}
        origin={viewing?.from ?? null}
        label={viewing?.activity.title}
        onDismiss={() => setViewing(null)}
      />
    </Screen>
  );
}
