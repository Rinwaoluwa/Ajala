import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CenteredHeader, EmptyState, PillTabs, PostCard, Screen, enterRise } from '@shared/components';
import { useSavedPosts } from '@shared/state/savedPosts';
import { SCREEN_GUTTER } from '@shared/theme';

import { profileViewCopy } from '../profileViewCopy';

/**
 * "Saved activities" (Figma): the posts the person bookmarked, newest first,
 * with the type pills. Tapping the bookmark on a card un-saves it and the card
 * folds away.
 *
 * ON THIS PHONE ONLY: there is no saves API yet (API map §12), so this lists
 * `savedPosts`, kept on the device. A card shows the post as it was when saved.
 */

type Filter = 'all' | 'meetup' | 'event' | 'plan' | 'group';
const FILTERS: { value: Filter; label: string }[] = [
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
  const insets = useSafeAreaInsets();
  const saved = useSavedPosts();
  const [filter, setFilter] = useState<Filter>('all');
  const items = useMemo(
    () => saved.filter((s) => filter === 'all' || s.post.type === filter).map((s) => s.post),
    [saved, filter],
  );
  const copy = profileViewCopy.saved;

  return (
    <Screen edges={['top']} padded={false}>
      <View className="px-20 pt-8">
        <CenteredHeader title={copy.title} onBack={onBack} />
      </View>
      <View className="mt-16">
        <PillTabs options={FILTERS} value={filter} onChange={setFilter} />
      </View>
      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{
          padding: SCREEN_GUTTER,
          paddingBottom: insets.bottom + 32,
          gap: 20,
          flexGrow: 1,
        }}
        renderItem={({ item, index }) => (
          <Animated.View
            entering={index < 3 ? enterRise(index * 60) : undefined}
            exiting={FadeOut.duration(180)}
            layout={LinearTransition.duration(220)}
          >
            <PostCard post={item} onPress={() => onOpenPost(item.id)} />
          </Animated.View>
        )}
        ListEmptyComponent={
          <View className="flex-1 justify-center">
            <EmptyState
              title={copy.emptyTitle}
              body={copy.emptyBody}
              action={{ label: copy.explore, onPress: onExplore }}
            />
          </View>
        }
      />
    </Screen>
  );
}
