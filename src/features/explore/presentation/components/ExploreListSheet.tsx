import { useMemo, useState } from 'react';
import { FlatList, ScrollView, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import {
  Button,
  LoadingRing,
  NativeIcon,
  Sheet,
  SkeletonBlock,
  SkeletonPulse,
  Text,
  TextField,
  enterRise,
  icons,
} from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

import { matchesSearch } from '../../domain/rules/exploreRules';
import { exploreCopy } from '../copy';
import { useInterests } from '../hooks/useInterests';
import { useNearbyMeetups } from '../hooks/useNearbyMeetups';
import { InterestGrid } from './InterestGrid';
import { MeetupCard } from './MeetupCard';

/**
 * "Explore" (Figma, opened by View List): "Find your people. Discover your city.",
 * a search box, Browse By Interest, then Meetups Near You.
 *
 * The search box narrows the meetups already loaded, by title or place: the API
 * has no search endpoint for posts (API map §7), only the interest filter on
 * `GET /explore/meetups`, which the grid drives.
 *
 * A tall sheet whose body scrolls; its queries run only while it is open.
 */
export function ExploreListSheet({
  isPresented,
  onDismiss,
  onOpenMeetup,
}: {
  isPresented: boolean;
  onDismiss: () => void;
  onOpenMeetup: (id: string) => void;
}) {
  return (
    <Sheet isPresented={isPresented} title={exploreCopy.list.title} onDismiss={onDismiss}>
      <ListBody onOpenMeetup={onOpenMeetup} />
    </Sheet>
  );
}

function ListBody({ onOpenMeetup }: { onOpenMeetup: (id: string) => void }) {
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const copy = exploreCopy.list;
  const [search, setSearch] = useState('');
  const [interestId, setInterestId] = useState<string | null>(null);
  const interests = useInterests();
  const meetups = useNearbyMeetups(interestId);
  const shown = useMemo(() => meetups.items.filter((m) => matchesSearch(m, search)), [meetups.items, search]);

  return (
    <ScrollView
      style={{ height: Math.round(height * 0.72) }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 12 }}
    >
      <Text variant="bodyMd" tone="muted">
        {copy.subtitle}
      </Text>
      <View className="mt-16">
        <TextField
          label={copy.searchPlaceholder}
          labelHidden
          filled
          placeholder={copy.searchPlaceholder}
          onChangeText={setSearch}
          autoCorrect={false}
          returnKeyType="search"
          leading={<NativeIcon source={icons.search} size={16} color={theme.muted} />}
        />
      </View>

      <Text variant="headingSm" className="mt-24" accessibilityRole="header">
        {copy.interests}
      </Text>
      <View className="mt-12">
        {interests.loading ? (
          <SkeletonPulse>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                  <SkeletonBlock width={56} height={56} radius={14} />
                  <SkeletonBlock width={48} height={10} />
                </View>
              ))}
            </View>
          </SkeletonPulse>
        ) : interests.failed ? (
          <Inline message={copy.interestsFailed} onRetry={interests.retry} />
        ) : (
          <Animated.View entering={FadeIn.duration(220)}>
            <InterestGrid interests={interests.interests} selected={interestId} onSelect={setInterestId} />
          </Animated.View>
        )}
      </View>

      <Text variant="headingSm" className="mt-24" accessibilityRole="header">
        {copy.nearby}
      </Text>
      <Text variant="bodySm" tone="muted">
        {copy.nearbySubtitle}
      </Text>
      <View className="mt-12">
        {meetups.loading ? (
          <SkeletonPulse>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {[0, 1].map((i) => (
                <View key={i} style={{ width: 200, gap: 8 }}>
                  <SkeletonBlock height={112} radius={14} />
                  <SkeletonBlock width="80%" height={14} />
                  <SkeletonBlock width="50%" height={10} />
                </View>
              ))}
            </View>
          </SkeletonPulse>
        ) : meetups.failed ? (
          <Inline message={copy.nearbyFailed} onRetry={meetups.retry} />
        ) : shown.length === 0 ? (
          <Text variant="bodySm" tone="muted" className="py-12">
            {meetups.items.length === 0 ? copy.nearbyEmpty : copy.nearbyNoMatch}
          </Text>
        ) : (
          <FlatList
            horizontal
            data={shown}
            keyExtractor={(m) => m.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
            renderItem={({ item, index }) => (
              <Animated.View entering={index < 3 ? enterRise(index * 60) : undefined}>
                <MeetupCard meetup={item} onPress={() => onOpenMeetup(item.id)} />
              </Animated.View>
            )}
            onEndReached={meetups.loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              meetups.loadingMore ? (
                <View style={{ justifyContent: 'center', height: 112, paddingHorizontal: 8 }}>
                  <LoadingRing size={24} accessibilityLabel="Loading more" />
                </View>
              ) : null
            }
          />
        )}
      </View>
    </ScrollView>
  );
}

function Inline({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <Text variant="bodySm" tone="muted" className="flex-1" accessibilityLiveRegion="polite">
        {message}
      </Text>
      <Button label={exploreCopy.list.retry} size="sm" variant="secondary" onPress={onRetry} />
    </View>
  );
}
