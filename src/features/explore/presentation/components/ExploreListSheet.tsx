import { useState } from 'react';
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

import { SEARCH_MAX, readSearch } from '../../domain/rules/exploreRules';
import { exploreCopy, exploreErrorMessages } from '../copy';
import { useInterests } from '../hooks/useInterests';
import { useNearbyMeetups } from '../hooks/useNearbyMeetups';
import { useSearchPosts } from '../hooks/useSearchPosts';
import { InterestGrid } from './InterestGrid';
import { MeetupCard } from './MeetupCard';

/**
 * "Explore" (Figma, opened by View List): "Find your people. Discover your city.",
 * a search box, Browse By Interest, then Meetups Near You.
 *
 * The search box searches posts in the feed's city on submit (`GET
 * /search/posts?q=`, 2–100 characters; no typeahead, as the spec asks). Its
 * results replace the interests and meetups until the box is cleared. Fewer than
 * two characters gets a hint under the box rather than a call the server would
 * refuse.
 *
 * Meetups Near You follows the interest grid: the feed's meetups with none
 * chosen, a search by the chosen interest otherwise (`useNearbyMeetups`).
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
  const [draft, setDraft] = useState('');
  /** The words last submitted; null shows the interests and meetups instead of results. */
  const [words, setWords] = useState<string | null>(null);
  const [tooShort, setTooShort] = useState(false);
  // Remounting the uncontrolled field is how it is cleared.
  const [fieldKey, setFieldKey] = useState(0);
  const search = useSearchPosts(words);

  const change = (text: string) => {
    setDraft(text);
    setTooShort(false);
    // Emptying the box by hand goes back to the list, as the clear button does.
    if (!text.trim()) setWords(null);
  };
  const submit = () => {
    const input = readSearch(draft);
    if (input.kind === 'empty') setWords(null);
    else if (input.kind === 'tooShort') setTooShort(true);
    else setWords(input.words);
  };
  const clear = () => {
    setDraft('');
    setWords(null);
    setTooShort(false);
    setFieldKey((k) => k + 1);
  };

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
          key={fieldKey}
          label={copy.searchPlaceholder}
          labelHidden
          filled
          placeholder={copy.searchPlaceholder}
          onChangeText={change}
          onSubmitEditing={submit}
          maxLength={SEARCH_MAX}
          autoCorrect={false}
          returnKeyType="search"
          helper={tooShort ? copy.searchTooShort : null}
          leading={<NativeIcon source={icons.search} size={16} color={theme.muted} />}
          trailing={draft ? <NativeIcon source={icons.close} size={12} color={theme.muted} /> : undefined}
          trailingAction={draft ? { onPress: clear, accessibilityLabel: copy.clearSearch } : undefined}
        />
      </View>

      {words !== null ? (
        <Results search={search} onOpen={onOpenMeetup} />
      ) : (
        <BrowseAndNearby onOpenMeetup={onOpenMeetup} />
      )}
    </ScrollView>
  );
}

/** Search results, one full-width card each, paged with "Show more". */
function Results({
  search,
  onOpen,
}: {
  search: ReturnType<typeof useSearchPosts>;
  onOpen: (id: string) => void;
}) {
  const copy = exploreCopy.list;
  return (
    <Animated.View entering={FadeIn.duration(180)}>
      <Text variant="headingSm" className="mt-24" accessibilityRole="header">
        {copy.results}
      </Text>
      <View className="mt-12">
        {search.loading ? (
          <SkeletonPulse>
            <View style={{ gap: 12 }}>
              {[0, 1].map((i) => (
                <View key={i} style={{ gap: 8 }}>
                  <SkeletonBlock height={112} radius={14} />
                  <SkeletonBlock width="70%" height={14} />
                </View>
              ))}
            </View>
          </SkeletonPulse>
        ) : search.error ? (
          <Inline
            message={search.error === 'noCity' ? exploreErrorMessages.noCity : copy.resultsFailed}
            onRetry={search.retry}
          />
        ) : search.items.length === 0 ? (
          <Text variant="bodySm" tone="muted" className="py-12" accessibilityLiveRegion="polite">
            {copy.resultsEmpty}
          </Text>
        ) : (
          <View style={{ gap: 12 }}>
            {search.items.map((post, index) => (
              <Animated.View key={post.id} entering={index < 3 ? enterRise(index * 60) : undefined}>
                <MeetupCard meetup={post} fill onPress={() => onOpen(post.id)} />
              </Animated.View>
            ))}
            {search.hasMore ? (
              <View style={{ alignSelf: 'center' }}>
                <Button
                  label={copy.showMore}
                  size="sm"
                  variant="secondary"
                  loading={search.loadingMore}
                  onPress={search.loadMore}
                />
              </View>
            ) : null}
            {search.capped ? (
              <Text variant="bodySm" tone="muted" className="text-center">
                {copy.resultsCapped}
              </Text>
            ) : null}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

function BrowseAndNearby({ onOpenMeetup }: { onOpenMeetup: (id: string) => void }) {
  const copy = exploreCopy.list;
  const [interestId, setInterestId] = useState<string | null>(null);
  const interests = useInterests();
  const meetups = useNearbyMeetups(interestId);

  return (
    <>
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
        ) : meetups.items.length === 0 ? (
          <Text variant="bodySm" tone="muted" className="py-12">
            {interestId ? copy.nearbyNoInterest : copy.nearbyEmpty}
          </Text>
        ) : (
          <FlatList
            horizontal
            data={meetups.items}
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
    </>
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
