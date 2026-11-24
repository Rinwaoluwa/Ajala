import { useEffect, useState, type ReactNode } from 'react';
import { Keyboard, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import {
  Avatar,
  Button,
  Host,
  NativeIcon,
  Sheet,
  SkeletonBlock,
  SkeletonPulse,
  Text,
  TextField,
  TextLink,
  UnderlineTabs,
  enterRise,
  icons,
  useListEntrance,
} from '@shared/components';
import { haptics } from '@shared/feedback/haptics';
import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER } from '@shared/theme';

import type { Interest, ListedPost, PostType } from '../../domain/entities/Explore';
import { SEARCH_MAX, SEARCH_MIN, readSearch, startingWith } from '../../domain/rules/exploreRules';
import { exploreCopy, exploreErrorMessages } from '../copy';
import { useInterests } from '../hooks/useInterests';
import { useMe } from '../hooks/useMe';
import { useNearbyMeetups } from '../hooks/useNearbyMeetups';
import { useRecentSearches } from '../hooks/useRecentSearches';
import { useRsvpGate } from '../hooks/useRsvpGate';
import { useSearchPeople } from '../hooks/useSearchPeople';
import { useSearchPosts } from '../hooks/useSearchPosts';
import { InterestGrid, columnsFor } from './InterestGrid';
import { MeetupCard } from './MeetupCard';
import { RsvpNoticeDialog } from './RsvpNoticeDialog';
import { TextPostCard } from './TextPostCard';

/**
 * "Explore" (opened by View List): search, Browse By Interest and Meetups Near
 * You, as one page in a full-height sheet.
 *
 * How it is laid out, and why (the feature's README has the sources):
 *
 *   - The search box is pinned at the top of the sheet and the sheet keeps its
 *     full height. It was inside the scrolling content of a sheet that rose
 *     with the keyboard, so opening the keyboard scrolled the box out of sight.
 *     Now the box never moves and is never under the keys; the list below makes
 *     room for them, and dragging it puts the keyboard away.
 *   - Tapping the box opens search in place: Cancel appears beside it, and the
 *     page under it becomes what helps a search get going. Empty, that is the
 *     past searches (kept on this phone). While typing, it is a "Search for …"
 *     row, the past searches that match, and the interests that match, all
 *     worked out on the phone: the API searches on submit and has no typeahead
 *     (spec §2.18), so nothing is asked of it per keystroke.
 *   - A search is run from the keyboard's Search key, the "Search for …" row or
 *     a past search. The keyboard goes away and the results take the page, with
 *     Activities and People a tap apart just under the box. People is asked
 *     only once it is opened.
 *   - Finding nothing is not a dead end: it says where the search looked and
 *     offers the other kind of result and a way back.
 *   - Browse By Interest opens out in place ("View all"), where it used to open
 *     a second sheet over this one. The interest chosen is the map's own: the
 *     list and the map behind it always show the same thing.
 *   - Meetups Near You is a list to read down, one full-width card each, with
 *     "Show more" at its end. It was a row to swipe sideways, which hides all
 *     but the first card and a half.
 *
 * `session` starts the sheet afresh: the screen changes it when View List is
 * tapped, and leaves it alone when the sheet closes only to show a result and
 * opens again on the way back, so a search and its results are still there.
 *
 * `search` is the search it opens on (`ListSearch`), when the map's field hands
 * one over: the words typed there are in the box and what they find is listed.
 * Without one it opens on its browse page (View List).
 *
 * A post with no photo is drawn as a text card (`TextPostCard`: its words, when
 * and where, and Join) where one with a photo is a photo card. Join's "Before
 * you RSVP" notice is drawn here, inside the sheet, so it can open over it.
 *
 * The searches run only while it is open, and Meetups Near You only while it is
 * drawn (the sheet's content is mounted only while the sheet is).
 */

/**
 * A search handed to the list as it opens (the Search key on the map's field):
 * the words typed there, and which of what they find to show. Two characters
 * or more are searched for at once. Fewer cannot be (spec §2.18): they are put
 * in the box, with the keyboard up, to be carried on with.
 */
export type ListSearch = { words: string; scope: 'activities' | 'people' };

export function ExploreListSheet({
  isPresented,
  session,
  search = null,
  onDismiss,
  onOpenMeetup,
  onOpenPerson,
  interestId,
  onInterestChange,
}: {
  isPresented: boolean;
  /** Changes when the list is opened anew (not when it comes back from a result). */
  session: number;
  /** The search to open on. Read when the list is opened anew. */
  search?: ListSearch | null;
  onDismiss: () => void;
  onOpenMeetup: (id: string, type: PostType) => void;
  onOpenPerson: (userId: string) => void;
  /** The interest the map is showing; null is all of them. */
  interestId: string | null;
  onInterestChange: (interestId: string | null) => void;
}) {
  return (
    <ListFlow
      key={session}
      startWith={search}
      isPresented={isPresented}
      onDismiss={onDismiss}
      onOpenMeetup={onOpenMeetup}
      onOpenPerson={onOpenPerson}
      interestId={interestId}
      onInterestChange={onInterestChange}
    />
  );
}

type SearchScope = 'activities' | 'people';

function ListFlow({
  startWith,
  isPresented,
  onDismiss,
  onOpenMeetup,
  onOpenPerson,
  interestId,
  onInterestChange,
}: {
  startWith: ListSearch | null;
  isPresented: boolean;
  onDismiss: () => void;
  onOpenMeetup: (id: string, type: PostType) => void;
  onOpenPerson: (userId: string) => void;
  interestId: string | null;
  onInterestChange: (interestId: string | null) => void;
}) {
  const theme = useTheme();
  const copy = exploreCopy.list;
  // Opened on a search from the map's field: its words, when they are enough to search for.
  const [handed] = useState(() => {
    if (!startWith) return null;
    const read = readSearch(startWith.words);
    return read.kind === 'ready' ? { words: read.words, scope: startWith.scope } : null;
  });
  // Too few to search for (one character): they go in the box to be carried on with.
  const [carried] = useState(() => (startWith && !handed ? startWith.words.trim() : ''));
  // Then the box takes the keyboard as the sheet comes up. Once only, so the keyboard does
  // not come back with the sheet after a result has been opened and left.
  const [focusOnOpen, setFocusOnOpen] = useState(carried !== '');
  /** What is in the box now. */
  const [draft, setDraft] = useState(handed?.words ?? carried);
  /** The words last run; null while nothing has been searched. */
  const [words, setWords] = useState<string | null>(handed?.words ?? null);
  /** Search is open: the box has been tapped, or there are results. */
  const [searching, setSearching] = useState(handed !== null || carried !== '');
  // The box keeps its own text and starts with `draft`; it is made anew (a new key) to empty it
  // or to put a past search in it. It also starts with `draft` when the sheet comes back.
  const [fieldKey, setFieldKey] = useState(0);
  const [scope, setScope] = useState<SearchScope>(handed?.scope ?? 'activities');
  // Asked only once People is opened; kept after, so switching back and forth is instant.
  const [peopleAsked, setPeopleAsked] = useState(handed?.scope === 'people');

  const posts = useSearchPosts(isPresented && scope === 'activities' ? words : null);
  const people = useSearchPeople(isPresented ? words : null, peopleAsked || scope === 'people');
  const recent = useRecentSearches();
  const interests = useInterests();
  // For the text cards' Join: whose posts are the reader's own, and the notice before a first RSVP.
  const myId = useMe().data?.id ?? null;
  const gate = useRsvpGate();
  // A search handed over is a search run: it is kept with the recent ones like any other.
  const { add: addRecent } = recent;
  const handedWords = handed?.words ?? null;
  useEffect(() => {
    if (handedWords) addRecent(handedWords);
    // Once, on opening. `addRecent` is a new function each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chooseScope = (next: SearchScope) => {
    setScope(next);
    if (next === 'people') setPeopleAsked(true);
  };

  const change = (text: string) => {
    setDraft(text);
    // Edited after a search (or emptied, by hand or the ×): the results belong to other
    // words now, so the page goes back to what helps the next search get going.
    if (words !== null && text.trim() !== words) setWords(null);
  };

  const run = (text: string) => {
    const input = readSearch(text);
    // Too short says so under the box as it is typed (`Suggestions`); nothing is run.
    if (input.kind !== 'ready') return;
    setWords(input.words);
    recent.add(input.words);
    // The results have the whole page: the keyboard has done its work.
    Keyboard.dismiss();
  };

  /** A past search, tapped: it goes in the box and runs. */
  const runAgain = (text: string) => {
    haptics.select();
    setDraft(text);
    setFieldKey((k) => k + 1);
    run(text);
  };

  const leaveSearch = () => {
    Keyboard.dismiss();
    setDraft('');
    setWords(null);
    setSearching(false);
    setFieldKey((k) => k + 1);
  };

  /** An interest picked from what was typed: browse by it. */
  const browseBy = (id: string) => {
    haptics.select();
    onInterestChange(id);
    leaveSearch();
  };

  const header = (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ flex: 1 }}>
          <TextField
            key={fieldKey}
            label={copy.searchPlaceholder}
            labelHidden
            filled
            placeholder={copy.searchPlaceholder}
            defaultValue={draft}
            onChangeText={change}
            onSubmitEditing={() => run(draft)}
            autoFocus={focusOnOpen}
            // Search stays open until Cancel: putting the keyboard away (a drag on the
            // list does) is not leaving it.
            onFocus={() => {
              setSearching(true);
              setFocusOnOpen(false);
            }}
            maxLength={SEARCH_MAX}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            clearable
            leading={<NativeIcon source={icons.search} size={16} color={theme.muted} />}
            testID="explore-search"
          />
        </View>
        {searching ? (
          <Animated.View entering={FadeIn.duration(160)}>
            <TextLink label={copy.cancel} onPress={leaveSearch} emphasis="plain" testID="explore-search-cancel" />
          </Animated.View>
        ) : null}
      </View>
      {words !== null ? (
        <UnderlineTabs
          options={[
            { value: 'activities' as const, label: copy.scopes.activities },
            { value: 'people' as const, label: copy.scopes.people },
          ]}
          value={scope}
          onChange={chooseScope}
        />
      ) : null}
    </View>
  );

  return (
    <Sheet
      isPresented={isPresented}
      title={copy.title}
      onDismiss={onDismiss}
      header={header}
      fill
      // Each of these is a page of its own, read from its top.
      page={!searching ? 'browse' : words === null ? 'suggest' : `${scope}:${words}`}
    >
      <View style={{ paddingBottom: 24 }}>
        {!searching ? (
          <Browse
            interests={interests}
            interestId={interestId}
            onInterestChange={onInterestChange}
            onOpenMeetup={onOpenMeetup}
            myId={myId}
            onBeforeRsvp={gate.beforeRsvp}
          />
        ) : words === null ? (
          <Suggestions
            typed={draft}
            recent={recent}
            interests={interests.interests}
            onRun={run}
            onRunAgain={runAgain}
            onBrowse={browseBy}
          />
        ) : scope === 'activities' ? (
          <Results
            words={words}
            search={posts}
            myId={myId}
            onBeforeRsvp={gate.beforeRsvp}
            onOpen={onOpenMeetup}
            onSeePeople={() => chooseScope('people')}
            onClear={leaveSearch}
          />
        ) : (
          <PeopleResults
            words={words}
            people={people}
            onOpen={onOpenPerson}
            onSeeActivities={() => chooseScope('activities')}
            onClear={leaveSearch}
          />
        )}
      </View>
      {/* Inside the sheet's own window: drawn under it, it could not open over it. */}
      <RsvpNoticeDialog {...gate.dialog} />
    </Sheet>
  );
}

/**
 * A post in the list: its photo card, or the text card when it has no photo to
 * show. A photo card opens the post; a text card also joins it from the list.
 */
function ListedCard({
  post,
  myId,
  onOpen,
  onBeforeRsvp,
}: {
  post: ListedPost;
  /** The signed-in person, to know their own posts; null until known. */
  myId: string | null;
  onOpen: (id: string, type: PostType) => void;
  onBeforeRsvp: () => Promise<boolean>;
}) {
  const open = () => onOpen(post.id, post.type);
  return post.imageUrl ? (
    <MeetupCard meetup={post} fill onPress={open} />
  ) : (
    <TextPostCard post={post} mine={myId !== null && post.hostId === myId} onPress={open} onBeforeRsvp={onBeforeRsvp} />
  );
}

/** One row of the search page: a glyph, a line (and a quieter one), and something at its end. */
function Row({
  glyph,
  title,
  detail,
  trailing,
  onPress,
  accessibilityLabel,
  first = false,
  testID,
}: {
  glyph: ReactNode;
  title: string;
  detail?: string;
  trailing?: ReactNode;
  onPress: () => void;
  accessibilityLabel?: string;
  first?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  return (
    // A plain style: a style function on a Pressable is dropped by the class-name interop.
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      testID={testID}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 52,
        paddingVertical: 10,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: theme.border,
      }}
    >
      <View style={{ width: 28, alignItems: 'center' }}>{glyph}</View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyMd" numberOfLines={1}>
          {title}
        </Text>
        {detail ? (
          <Text variant="bodyXs" tone="muted" numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
      {trailing}
    </TouchableOpacity>
  );
}

/**
 * Under the box before a search is run. Nothing typed: the past searches. As
 * someone types: a way to run what they have, then the past searches and the
 * interests it could be the start of. All from the phone; the server is asked
 * only when a search is run.
 */
function Suggestions({
  typed,
  recent,
  interests,
  onRun,
  onRunAgain,
  onBrowse,
}: {
  typed: string;
  recent: ReturnType<typeof useRecentSearches>;
  interests: Interest[];
  onRun: (text: string) => void;
  onRunAgain: (text: string) => void;
  onBrowse: (interestId: string) => void;
}) {
  const theme = useTheme();
  const copy = exploreCopy.list;
  const text = typed.trim();
  const clock = (
    <Host matchContents pointerEvents="none" ignoreSafeArea="all">
      <NativeIcon source={icons.clock} size={16} color={theme.muted} />
    </Host>
  );

  if (!text) {
    return recent.items.length ? (
      <Animated.View entering={FadeIn.duration(180)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Text variant="labelSm" tone="muted" accessibilityRole="header">
            {copy.recent}
          </Text>
          <TextLink label={copy.clearRecent} onPress={recent.clear} emphasis="plain" />
        </View>
        <View style={{ marginTop: 4 }}>
          {recent.items.map((item, index) => (
            <Row
              key={item}
              first={index === 0}
              glyph={clock}
              title={item}
              accessibilityLabel={copy.searchAgain(item)}
              onPress={() => onRunAgain(item)}
              trailing={
                <TouchableOpacity
                  activeOpacity={0.6}
                  onPress={() => recent.remove(item)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={copy.removeRecent(item)}
                  style={{ padding: 6 }}
                >
                  <Host matchContents pointerEvents="none" ignoreSafeArea="all">
                    <NativeIcon source={icons.close} size={11} color={theme.muted} />
                  </Host>
                </TouchableOpacity>
              }
            />
          ))}
        </View>
      </Animated.View>
    ) : (
      <Animated.View entering={FadeIn.duration(180)}>
        <Text variant="bodySm" tone="muted">
          {copy.searchHint}
        </Text>
      </Animated.View>
    );
  }

  const pastMatches = startingWith(recent.items, text, (r) => r, 3).filter(
    (r) => r.toLowerCase() !== text.toLowerCase(),
  );
  const interestMatches = startingWith(interests, text, (i) => i.name, 4);
  const ready = text.length >= SEARCH_MIN;

  return (
    <View>
      {ready ? (
        <Row
          first
          glyph={
            <Host matchContents pointerEvents="none" ignoreSafeArea="all">
              <NativeIcon source={icons.search} size={16} color={theme.primary} />
            </Host>
          }
          title={copy.searchFor(text)}
          onPress={() => onRun(text)}
          testID="explore-search-run"
        />
      ) : (
        <Text variant="bodySm" tone="muted" style={{ paddingVertical: 10 }} accessibilityLiveRegion="polite">
          {copy.searchTooShort}
        </Text>
      )}
      {pastMatches.map((item) => (
        <Row
          key={`past-${item}`}
          glyph={clock}
          title={item}
          accessibilityLabel={copy.searchAgain(item)}
          onPress={() => onRunAgain(item)}
        />
      ))}
      {interestMatches.map((interest) => (
        <Row
          key={`interest-${interest.id}`}
          glyph={<Text variant="bodyMd">{interest.emoji ?? '•'}</Text>}
          title={interest.name}
          detail={copy.browseInterest}
          accessibilityLabel={copy.browseBy(interest.name)}
          onPress={() => onBrowse(interest.id)}
        />
      ))}
    </View>
  );
}

/** Nothing found: where the search looked, and what to try next. Never a dead end. */
function NothingFound({
  title,
  body,
  other,
  onOther,
  onClear,
}: {
  title: string;
  body: string;
  other: string;
  onOther: () => void;
  onClear: () => void;
}) {
  return (
    <Animated.View entering={FadeIn.duration(180)} style={{ paddingVertical: 28, alignItems: 'center', gap: 8 }}>
      <Text variant="headingSm" className="text-center" accessibilityRole="header" accessibilityLiveRegion="polite">
        {title}
      </Text>
      <Text variant="bodySm" tone="muted" className="text-center">
        {body}
      </Text>
      {/* Side by side when they fit, stacked at large text or on a narrow phone. */}
      <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
        <Button label={other} size="sm" onPress={onOther} />
        <Button label={exploreCopy.list.clearSearch} size="sm" variant="secondary" onPress={onClear} />
      </View>
    </Animated.View>
  );
}

/** Activities found, one full-width card each, with "Show more" at the end. */
function Results({
  words,
  search,
  myId,
  onBeforeRsvp,
  onOpen,
  onSeePeople,
  onClear,
}: {
  words: string;
  search: ReturnType<typeof useSearchPosts>;
  myId: string | null;
  onBeforeRsvp: () => Promise<boolean>;
  onOpen: (id: string, type: PostType) => void;
  onSeePeople: () => void;
  onClear: () => void;
}) {
  const copy = exploreCopy.list;
  if (search.loading) {
    return (
      <SkeletonPulse>
        <View style={{ gap: 16 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ gap: 8 }}>
              <SkeletonBlock height={112} radius={14} />
              <SkeletonBlock width="70%" height={14} />
            </View>
          ))}
        </View>
      </SkeletonPulse>
    );
  }
  if (search.error) {
    return (
      <Inline
        message={search.error === 'noLocation' ? exploreErrorMessages.noLocation : copy.resultsFailed}
        onRetry={search.retry}
      />
    );
  }
  if (search.items.length === 0) {
    return (
      <NothingFound
        title={copy.noActivities(words)}
        body={copy.noActivitiesBody}
        other={copy.seePeople}
        onOther={onSeePeople}
        onClear={onClear}
      />
    );
  }
  return (
    <Animated.View entering={FadeIn.duration(180)} style={{ gap: 12 }}>
      {search.items.map((post, index) => (
        <Animated.View key={post.id} entering={index < 3 ? enterRise(index * 60) : undefined}>
          <ListedCard post={post} myId={myId} onOpen={onOpen} onBeforeRsvp={onBeforeRsvp} />
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
    </Animated.View>
  );
}

/** People found: photo, name, then @handle and where they're based; a tap opens their profile. */
function PeopleResults({
  words,
  people,
  onOpen,
  onSeeActivities,
  onClear,
}: {
  words: string;
  people: ReturnType<typeof useSearchPeople>;
  onOpen: (userId: string) => void;
  onSeeActivities: () => void;
  onClear: () => void;
}) {
  const theme = useTheme();
  const copy = exploreCopy.list;
  if (people.loading) {
    return (
      <SkeletonPulse>
        <View style={{ gap: 16 }}>
          {[0, 1, 2, 3].map((i) => (
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
    );
  }
  if (people.error) return <Inline message={copy.peopleFailed} onRetry={people.retry} />;
  if (people.items.length === 0) {
    return (
      <NothingFound
        title={copy.noPeople(words)}
        body={copy.noPeopleBody}
        other={copy.seeActivities}
        onOther={onSeeActivities}
        onClear={onClear}
      />
    );
  }
  return (
    <Animated.View entering={FadeIn.duration(180)}>
      {people.items.map((person, index) => {
        const detail = [person.handle ? `@${person.handle}` : null, person.place].filter(Boolean).join(' · ');
        return (
          <Row
            key={person.id}
            first={index === 0}
            glyph={<Avatar name={person.displayName} uri={person.avatarUrl} size={28} />}
            title={person.displayName}
            detail={detail || undefined}
            accessibilityLabel={copy.openPerson(person.displayName)}
            onPress={() => onOpen(person.id)}
            trailing={
              <Host matchContents pointerEvents="none" ignoreSafeArea="all">
                <NativeIcon source={icons.chevronRight} size={14} color={theme.muted} />
              </Host>
            }
          />
        );
      })}
      {people.hasMore ? (
        <View style={{ alignSelf: 'center', marginTop: 12 }}>
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
        <Text variant="bodySm" tone="muted" className="mt-8 text-center">
          {copy.peopleCapped}
        </Text>
      ) : null}
    </Animated.View>
  );
}

/** The page before any search: the interests, then the meetups nearby (for the one chosen, if any). */
function Browse({
  interests,
  interestId,
  onInterestChange,
  onOpenMeetup,
  myId,
  onBeforeRsvp,
}: {
  interests: ReturnType<typeof useInterests>;
  interestId: string | null;
  onInterestChange: (interestId: string | null) => void;
  onOpenMeetup: (id: string, type: PostType) => void;
  myId: string | null;
  onBeforeRsvp: () => Promise<boolean>;
}) {
  const copy = exploreCopy.list;
  const meetups = useNearbyMeetups(interestId);
  const [allShown, setAllShown] = useState(false);
  // Two rows of tiles; "View all" opens the rest out in place. The chosen
  // interest always shows, in the last place if it isn't already among them.
  const { width, fontScale } = useWindowDimensions();
  const shownCount = columnsFor(width - SCREEN_GUTTER * 2, fontScale) * 2;
  const first = interests.interests.slice(0, shownCount);
  const chosen = interestId ? interests.interests.find((i) => i.id === interestId) : undefined;
  const shownInterests = allShown
    ? interests.interests
    : chosen && !first.some((i) => i.id === chosen.id)
      ? [...first.slice(0, shownCount - 1), chosen]
      : first;
  const enterMeetup = useListEntrance(meetups.items.length > 0);

  return (
    <>
      <Text variant="bodyMd" tone="muted">
        {copy.subtitle}
      </Text>

      <View className="mt-20 flex-row items-center justify-between" style={{ gap: 12 }}>
        <Text variant="headingSm" accessibilityRole="header" style={{ flexShrink: 1 }}>
          {copy.interests}
        </Text>
        {interests.interests.length > shownCount ? (
          <TextLink
            label={allShown ? copy.showFewerInterests : copy.viewAllInterests}
            onPress={() => setAllShown((v) => !v)}
            emphasis="plain"
          />
        ) : null}
      </View>
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
            <InterestGrid interests={shownInterests} selected={interestId} onSelect={onInterestChange} />
          </Animated.View>
        )}
      </View>

      <View className="mt-24 flex-row items-center justify-between" style={{ gap: 12 }}>
        <Text variant="headingSm" accessibilityRole="header" style={{ flexShrink: 1 }}>
          {chosen ? copy.nearbyFor(chosen.name) : copy.nearby}
        </Text>
        {chosen ? <TextLink label={copy.showAllMeetups} onPress={() => onInterestChange(null)} emphasis="plain" /> : null}
      </View>
      <Text variant="bodySm" tone="muted">
        {copy.nearbySubtitle}
      </Text>
      <View className="mt-12">
        {meetups.loading ? (
          <SkeletonPulse>
            <View style={{ gap: 16 }}>
              {[0, 1].map((i) => (
                <View key={i} style={{ gap: 8 }}>
                  <SkeletonBlock height={112} radius={14} />
                  <SkeletonBlock width="70%" height={14} />
                  <SkeletonBlock width="45%" height={10} />
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
          // With an interest chosen, the way back to every meetup is the link beside the heading.
          <Text variant="bodySm" tone="muted" style={{ paddingVertical: 12 }} accessibilityLiveRegion="polite">
            {chosen ? copy.nearbyNoInterest : copy.nearbyEmpty}
          </Text>
        ) : (
          <View style={{ gap: 12 }}>
            {meetups.items.map((meetup, index) => (
              <Animated.View key={meetup.id} entering={enterMeetup(index)}>
                <ListedCard post={meetup} myId={myId} onOpen={onOpenMeetup} onBeforeRsvp={onBeforeRsvp} />
              </Animated.View>
            ))}
            {meetups.hasMore ? (
              <View style={{ alignSelf: 'center' }}>
                <Button
                  label={copy.showMore}
                  size="sm"
                  variant="secondary"
                  loading={meetups.loadingMore}
                  onPress={meetups.loadMore}
                />
              </View>
            ) : null}
          </View>
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
