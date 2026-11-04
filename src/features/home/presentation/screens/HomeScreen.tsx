import { useCallback, useEffect, useState, type ReactElement, type ReactNode } from 'react';
import { FlatList, RefreshControl, ScrollView, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSubscription } from '@features/payment';
import { Button, LoadingRing, PostCard as PostCardView, Screen, Text, enterRise } from '@shared/components';
import { useFontScale } from '@shared/hooks/useFontScale';
import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER } from '@shared/theme';

import type { FeedCity, PostCard } from '../../domain/entities/Feed';
import { FEED_FILTERS } from '../../domain/rules/feedRules';
import { FeedHeader } from '../components/FeedHeader';
import { FeedSkeleton } from '../components/FeedSkeleton';
import { FilterPills } from '../components/FilterPills';
import { LevelCard } from '../components/LevelCard';
import { homeCopy } from '../copy';
import { useFeed } from '../hooks/useFeed';
import { travelStore } from '../state/travelStore';

/**
 * The home feed (Figma "Home Feed", its skeleton, light and dark): the city
 * header, the level card, the post-type pills over a hairline, then the cards.
 *
 * Until the first page lands the whole screen is the skeleton frame. The cards
 * enter in a short stagger (the first three; later pages simply appear). Pull to
 * refresh asks again from the top; nearing the end loads the next page.
 *
 * The list leaves room at its foot for the floating tab bar.
 *
 * At a large text size or on a short phone the level card scrolls away with the
 * cards instead of staying above them, so it can never squeeze the feed out.
 */

/** Clear of the floating tab bar and its overhanging "+". */
const TAB_BAR_CLEARANCE = 120;

export type HomeScreenProps = {
  onChooseCity: (city: FeedCity) => void;
  onOpenPost: (post: PostCard) => void;
  onNotifications: () => void;
  onMessages: () => void;
  onViewLevel: () => void;
  /**
   * Wraps each card in a link that opens its post (the route supplies it; on
   * iOS 18+ with the zoom transition, the card growing into the page). When
   * given, the link does the opening and `onOpenPost` is not called.
   */
  linkCard?: (post: PostCard, card: ReactElement) => ReactNode;
};

/** A card inside a link: the link opens the post, so the card's own press does nothing. */
const OPENED_BY_LINK = () => undefined;

export function HomeScreen({
  onChooseCity,
  onOpenPost,
  onNotifications,
  onMessages,
  onViewLevel,
  linkCard,
}: HomeScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const feed = useFeed();
  const { isPro } = useSubscription();
  // Home stays mounted across the tabs; it unmounts when the person signs out,
  // and then the next account must not start somewhere else.
  useEffect(() => () => travelStore.reset(), []);
  // The level card is a placeholder; closing it hides it for this visit.
  const [levelClosed, setLevelClosed] = useState(false);
  const bottom = TAB_BAR_CLEARANCE + insets.bottom;
  const fontScale = useFontScale();
  const { height: windowHeight } = useWindowDimensions();
  const levelScrolls = fontScale > 1.3 || windowHeight < 700;
  const levelCard =
    feed.city && !levelClosed ? (
      <Animated.View
        entering={enterRise(80)}
        exiting={FadeOut.duration(180)}
        className={levelScrolls ? undefined : 'mt-16 px-20'}
      >
        <LevelCard onView={onViewLevel} onClose={() => setLevelClosed(true)} />
      </Animated.View>
    ) : null;

  const renderItem = useCallback(
    ({ item, index }: { item: PostCard; index: number }) => {
      const card = <PostCardView post={item} onPress={linkCard ? OPENED_BY_LINK : () => onOpenPost(item)} />;
      return (
        <Animated.View entering={index < 3 ? enterRise(index * 60) : undefined}>
          {linkCard ? linkCard(item, card) : card}
        </Animated.View>
      );
    },
    [onOpenPost, linkCard],
  );

  const typeLabel = FEED_FILTERS.find((f) => f.value === feed.filter)?.label.toLowerCase() ?? 'posts';

  return (
    <Screen edges={['top']} padded={false}>
      <FeedHeader
        city={feed.city}
        citySource={feed.citySource}
        isPro={isPro}
        travellingFrom={feed.travellingFrom}
        onChooseCity={() => feed.city && onChooseCity(feed.city)}
        onNotifications={onNotifications}
        onMessages={onMessages}
      />

      {levelScrolls ? null : levelCard}

      <View className="mt-16">
        <FilterPills value={feed.filter} onChange={feed.setFilter} disabled={!feed.city && feed.loading} />
      </View>
      <View className="mt-12" style={{ height: 1, backgroundColor: theme.border }} />

      {feed.loading ? (
        <ScrollView
          scrollEnabled={false}
          contentContainerStyle={{ padding: SCREEN_GUTTER, paddingBottom: bottom }}
        >
          <FeedSkeleton />
        </ScrollView>
      ) : feed.error && feed.items.length === 0 ? (
        <Animated.View entering={FadeIn.duration(220)} className="flex-1 items-center justify-center px-20">
          <Text variant="headingMd" className="text-center" accessibilityRole="header">
            {homeCopy.failed.title}
          </Text>
          <Text variant="bodySm" tone="muted" className="mt-8 text-center" accessibilityLiveRegion="polite">
            {feed.error === 'noCity'
              ? homeCopy.failed.noCity
              : feed.error === 'network'
                ? homeCopy.failed.network
                : homeCopy.failed.unknown}
          </Text>
          <View className="mt-20">
            <Button label={homeCopy.failed.retry} onPress={feed.retry} />
          </View>
        </Animated.View>
      ) : (
        <FlatList
          data={feed.items}
          keyExtractor={(post) => post.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: SCREEN_GUTTER, paddingBottom: bottom, gap: 24, flexGrow: 1 }}
          ListHeaderComponent={levelScrolls ? levelCard : null}
          onEndReached={feed.loadMore}
          onEndReachedThreshold={0.6}
          refreshControl={
            <RefreshControl refreshing={feed.refreshing} onRefresh={feed.refresh} tintColor={theme.primary} />
          }
          ListEmptyComponent={
            <Animated.View
              entering={FadeIn.duration(220)}
              className="flex-1 items-center justify-center py-48"
            >
              <Text variant="headingMd" className="text-center">
                {homeCopy.empty.title}
              </Text>
              <Text variant="bodySm" tone="muted" className="mt-8 text-center">
                {homeCopy.empty.body(
                  feed.filter === 'all' ? 'posts' : typeLabel,
                  feed.city?.name ?? 'your city',
                )}
              </Text>
            </Animated.View>
          }
          ListFooterComponent={
            feed.loadingMore ? (
              <View className="items-center py-8">
                <LoadingRing size={28} accessibilityLabel="Loading more" />
              </View>
            ) : null
          }
        />
      )}
    </Screen>
  );
}
