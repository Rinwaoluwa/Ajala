import { useState } from 'react';
import { FlatList, ScrollView, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import {
  Avatar,
  Button,
  Host,
  LoadingRing,
  NativeIcon,
  Sheet,
  SkeletonBlock,
  SkeletonPulse,
  Text,
  TextField,
  UnderlineTabs,
  enterRise,
  icons,
  useListEntrance,
} from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

import { SEARCH_MAX, readSearch } from '../../domain/rules/exploreRules';
import { exploreCopy, exploreErrorMessages } from '../copy';
import { useInterests } from '../hooks/useInterests';
import { useNearbyMeetups } from '../hooks/useNearbyMeetups';
import { useSearchPeople } from '../hooks/useSearchPeople';
import { useSearchPosts } from '../hooks/useSearchPosts';
import { InterestGrid } from './InterestGrid';
import { MeetupCard } from './MeetupCard';

/**
 * "Explore" (Figma, opened by View List): "Find your people. Discover your city.",
 * a search box, Browse By Interest, then Meetups Near You.
 *
 * The search box searches on submit (2–100 characters; no typeahead, as the spec
 * asks), in two tabs: Activities, posts within 30 km of where the feed looks
 * (`GET /search/posts?q=`), and People, travellers by first name or handle
 * (`GET /search/people?q=`; opened on their profile). The results replace the
 * interests and meetups until the box is cleared. Fewer than
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
  onOpenPerson,
}: {
  isPresented: boolean;
  onDismiss: () => void;
  onOpenMeetup: (id: string) => void;
  onOpenPerson: (userId: string) => void;
}) {
  return (
    <Sheet isPresented={isPresented} title={exploreCopy.list.title} onDismiss={onDismiss}>
      <ListBody onOpenMeetup={onOpenMeetup} onOpenPerson={onOpenPerson} />
    </Sheet>
  );
}

type SearchScope = 'activities' | 'people';

function ListBody({
  onOpenMeetup,
  onOpenPerson,
}: {
  onOpenMeetup: (id: string) => void;
  onOpenPerson: (userId: string) => void;
}) {
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const copy = exploreCopy.list;
  const [draft, setDraft] = useState('');
  /** The words last submitted; null shows the interests and meetups instead of results. */
  const [words, setWords] = useState<string | null>(null);
  const [tooShort, setTooShort] = useState(false);
  // Remounting the uncontrolled field is how it is cleared.
  const [fieldKey, setFieldKey] = useState(0);
  const [scope, setScope] = useState<SearchScope>('activities');
  const search = useSearchPosts(scope === 'activities' ? words : null);
  // Asked only once People is opened; kept after, so switching back and forth is instant.
  const [peopleAsked, setPeopleAsked] = useState(false);
  const people = useSearchPeople(words, peopleAsked || scope === 'people');
  const chooseScope = (next: SearchScope) => {
    setScope(next);
    if (next === 'people') setPeopleAsked(true);
  };

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
        <>
          <View className="mt-16">
            <UnderlineTabs
              options={[
                { value: 'activities' as const, label: copy.scopes.activities },
                { value: 'people' as const, label: copy.scopes.people },
              ]}
              value={scope}
              onChange={chooseScope}
            />
          </View>
          {scope === 'activities' ? (
            <Results search={search} onOpen={onOpenMeetup} />
          ) : (
            <PeopleResults people={people} onOpen={onOpenPerson} />
          )}
        </>
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
            message={search.error === 'noLocation' ? exploreErrorMessages.noLocation : copy.resultsFailed}
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

/** People results: avatar, name, then @handle and where they're based; a tap opens their profile. */
function PeopleResults({
  people,
  onOpen,
}: {
  people: ReturnType<typeof useSearchPeople>;
  onOpen: (userId: string) => void;
}) {
  const theme = useTheme();
  const copy = exploreCopy.list;
  return (
    <Animated.View entering={FadeIn.duration(180)} className="mt-16">
      {people.loading ? (
        <SkeletonPulse>
          <View style={{ gap: 16 }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <SkeletonBlock width={44} height={44} radius={22} />
                <View style={{ flex: 1, gap: 6 }}>
                  <SkeletonBlock width="50%" height={14} />
                  <SkeletonBlock width="70%" height={10} />
                </View>
              </View>
            ))}
          </View>
        </SkeletonPulse>
      ) : people.error ? (
        <Inline message={copy.peopleFailed} onRetry={people.retry} />
      ) : people.items.length === 0 ? (
        <Text variant="bodySm" tone="muted" className="py-12" accessibilityLiveRegion="polite">
          {copy.peopleEmpty}
        </Text>
      ) : (
        <View>
          {people.items.map((person, index) => {
            const detail = [person.handle ? `@${person.handle}` : null, person.place].filter(Boolean).join(' · ');
            return (
              <TouchableOpacity
                key={person.id}
                activeOpacity={0.6}
                onPress={() => onOpen(person.id)}
                accessibilityRole="button"
                accessibilityLabel={copy.openPerson(person.displayName)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 12,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: theme.border,
                }}
              >
                <Avatar name={person.displayName} uri={person.avatarUrl} size={44} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="labelMd" numberOfLines={1}>
                    {person.displayName}
                  </Text>
                  {detail ? (
                    <Text variant="bodyXs" tone="muted" numberOfLines={1}>
                      {detail}
                    </Text>
                  ) : null}
                </View>
                <Host matchContents pointerEvents="none">
                  <NativeIcon source={icons.chevronRight} size={14} color={theme.muted} />
                </Host>
              </TouchableOpacity>
            );
          })}
          {people.hasMore ? (
            <View style={{ alignSelf: 'center', marginTop: 8 }}>
              <Button
                label={copy.showMore}
                size="sm"
                variant="secondary"
                loading={people.loadingMore}
                onPress={people.loadMore}
              />
            </View>
          ) : null}
          {people.capped ? (
            <Text variant="bodySm" tone="muted" className="text-center mt-8">
              {copy.peopleCapped}
            </Text>
          ) : null}
        </View>
      )}
    </Animated.View>
  );
}

function BrowseAndNearby({ onOpenMeetup }: { onOpenMeetup: (id: string) => void }) {
  const copy = exploreCopy.list;
  const [interestId, setInterestId] = useState<string | null>(null);
  const interests = useInterests();
  const meetups = useNearbyMeetups(interestId);
  const enterMeetup = useListEntrance(meetups.items.length > 0);

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
          <Inline
            message={meetups.noLocation ? exploreErrorMessages.noLocation : copy.nearbyFailed}
            onRetry={meetups.retry}
          />
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
              <Animated.View entering={enterMeetup(index)}>
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
