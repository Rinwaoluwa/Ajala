import { useRef } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Host,
  Button,
  LoadFailedState,
  LoadingRing,
  Logo,
  NativeIcon,
  Screen,
  SvgIcon,
  Text,
  UnderlineTabs,
  VectorIcon,
  icons,
  tabBarMinimize,
  useMinimizeTabBarOnScroll,
  useOnSignal,
} from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { useAppColorScheme } from '@shared/hooks/useAppColorScheme';
import { SCREEN_GUTTER, palette } from '@shared/theme';

import { LANGUAGES, travelStyleLabel } from '../../domain/rules/profileSetupRules';
import { AchievementsPreview } from '../components/AchievementsPreview';
import { FeaturedPhotos } from '../components/FeaturedPhotos';
import { ActivityCard } from '../components/ActivityCard';
import { ActivityCardSkeleton } from '../components/ActivityCardSkeleton';
import { ProfileHero } from '../components/ProfileHero';
import { ProfilePostCard } from '../components/ProfilePostCard';
import { RoundIconButton } from '../components/RoundIconButton';
import { TravelDetails } from '../components/TravelDetails';
import { useOwnProfile } from '../hooks/useOwnProfile';
import type { OwnProfileTab, useOwnProfileLists } from '../hooks/useOwnProfileLists';
import { profileViewCopy } from '../profileViewCopy';
import { profileLink, shareProfile } from '../shareProfile';

/**
 * The Profile tab (Figma Own Profile, "Maya Chen"): the Ajala logo with the
 * bell and settings on glass; the hero (photo, name, @handle, city, Meetups ·
 * Countries · Streak, interests); Edit profile and share; the bio; "Travel
 * details" (languages, travel style, favourite places, links, Saved
 * activities); Featured Photos; the Achievements preview; then the person's
 * lists, last because they are the part with no end: My posts and Saved as the
 * design draws them, and Going and Requested after those.
 *
 * From `GET /me` (shared with Edit profile and setup), the attended history and
 * the lists' own reads (`useOwnProfileLists`). Sections with nothing to show
 * are left out rather than drawn empty. Pull to refresh asks again.
 */

const TAB_BAR_CLEARANCE = 120;
const LOGO_WIDTH = 116;

export type OwnProfileScreenProps = {
  onSettings: () => void;
  onNotifications: () => void;
  /** Unread notifications; above zero, a dot on the bell. */
  unreadNotifications?: number;
  onEditProfile: () => void;
  onSaved: () => void;
  onAchievements: () => void;
  onOpenPost: (postId: string) => void;
  /** Changes when the Profile tab is tapped while Profile is in front: the page goes back to its top. */
  toTopSignal?: number;
};

export function OwnProfileScreen(props: OwnProfileScreenProps) {
  const theme = useTheme();
  const scheme = useAppColorScheme();
  const insets = useSafeAreaInsets();
  // Scrolling down the profile shrinks the tab bar out of the way; back up brings it back.
  const minimizeOnScroll = useMinimizeTabBarOnScroll();
  const page = useRef<ScrollView>(null);
  // The Profile tab tapped while on Profile: back to the top of the page.
  useOnSignal(props.toTopSignal, () => {
    tabBarMinimize.set(false);
    page.current?.scrollTo({ y: 0, animated: true });
  });
  const vm = useOwnProfile();
  const copy = profileViewCopy;
  const unread = props.unreadNotifications ?? 0;

  if (vm.loading) {
    return (
      <Screen edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <LoadingRing size={48} accessibilityLabel="Loading your profile" />
        </View>
      </Screen>
    );
  }
  // A failed refresh keeps the cached profile on screen; only a profile that never loaded
  // (nothing in the cache, not even from the last launch) shows the failure.
  if (!vm.profile) {
    return (
      <Screen edges={['top']}>
        <View className="flex-1 justify-center">
          <LoadFailedState
            kind={vm.networkFailure ? 'network' : 'server'}
            title={copy.failed.title}
            body={copy.failed.body}
            action={{ label: copy.failed.retry, onPress: vm.retry, variant: 'primary' }}
          />
        </View>
      </Screen>
    );
  }

  const p = vm.profile;
  const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || (p.handle ?? '');
  const link = profileLink(p.handle, p.id);
  const links = p.about?.socialLinks;

  return (
    <Screen edges={['top']} padded={false}>
      {/* Pinned: the logo, bell and settings stay put while the profile scrolls under them. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingTop: 8,
          paddingBottom: 12,
          paddingHorizontal: SCREEN_GUTTER,
          backgroundColor: theme.background,
        }}
      >
        <View style={{ flex: 1, alignItems: 'flex-start' }} accessibilityRole="header" accessibilityLabel="Ajala">
          <Logo width={LOGO_WIDTH} tone={scheme === 'dark' ? 'inverse' : 'brand'} />
        </View>
        <RoundIconButton
          label={unread > 0 ? copy.unreadNotifications(unread) : copy.notifications}
          onPress={props.onNotifications}
        >
          <View>
            <VectorIcon name="bell" size={20} color={theme.foreground} />
            {unread > 0 ? (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: -1,
                  right: -1,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: palette.coral,
                }}
              />
            ) : null}
          </View>
        </RoundIconButton>
        <RoundIconButton label={copy.settings} onPress={props.onSettings}>
          <Host matchContents pointerEvents="none" ignoreSafeArea="all">
            <NativeIcon source={icons.settings} size={18} color={theme.foreground} />
          </Host>
        </RoundIconButton>
      </View>
      <ScrollView
        ref={page}
        {...minimizeOnScroll}
        // Android draws scrolled content past the edges unless told to clip, over the header above.
        style={{ flex: 1, overflow: 'hidden' }}
        contentContainerStyle={{
          paddingTop: 12,
          paddingHorizontal: SCREEN_GUTTER,
          paddingBottom: TAB_BAR_CLEARANCE + insets.bottom,
          gap: 24,
        }}
        refreshControl={
          <RefreshControl refreshing={vm.refreshing} onRefresh={vm.refresh} tintColor={theme.primary} />
        }
      >

        <ProfileHero
          name={name}
          handle={p.handle}
          pronouns={p.about?.pronouns}
          avatarUrl={p.avatarUrl}
          city={p.homePlace?.label}
          interests={p.interests}
          counters={vm.derived?.counters ?? null}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Button
              label={copy.editProfile}
              icon={icons.editSquare}
              size="md"
              fullWidth
              onPress={props.onEditProfile}
            />
          </View>
          <RoundIconButton label={copy.shareProfile} size={44} onPress={() => shareProfile(name, link)}>
            <SvgIcon name="share" size={18} tint={theme.primary} />
          </RoundIconButton>
        </View>

        {p.about?.bio || p.about?.tagline ? (
          <View style={{ gap: 4, marginTop: -4 }}>
            {p.about?.tagline ? <Text variant="bodySm">{p.about.tagline}</Text> : null}
            {p.about?.bio ? <Text variant="bodySm">{p.about.bio}</Text> : null}
          </View>
        ) : null}

        <TravelDetails
          data={{
            languages: p.languages.map(
              (code) => LANGUAGES.find((l) => l.value === code)?.label ?? code.toUpperCase(),
            ),
            travelStyles: p.travelStyles.map(travelStyleLabel),
            // The server's label ("Lisbon, Portugal"), so two cities with one name read apart.
            places: p.favouriteDestinations.map((c) => c.label),
            website: links?.website,
            instagram: links?.instagram,
            tiktok: links?.tiktok,
          }}
          onEdit={props.onEditProfile}
          onSaved={props.onSaved}
        />

        <FeaturedPhotos photos={p.about?.photos ?? []} own name={name} onAdd={props.onEditProfile} />

        {vm.derived ? (
          <AchievementsPreview
            preview={vm.derived.preview}
            earned={vm.derived.earned}
            inProgress={vm.derived.inProgress}
            onSeeAll={props.onAchievements}
            onOpenBadge={props.onAchievements}
          />
        ) : null}

        <ProfileLists lists={vm.lists} onOpenPost={props.onOpenPost} />
      </ScrollView>
    </Screen>
  );
}

const LIST_TABS: readonly { value: OwnProfileTab; label: string }[] = [
  { value: 'posts', label: profileViewCopy.lists.posts },
  { value: 'saved', label: profileViewCopy.lists.saved },
  { value: 'going', label: profileViewCopy.lists.going },
  { value: 'requested', label: profileViewCopy.lists.requested },
];

/**
 * The person's lists (Figma Own Profile, "My posts · Saved"): the tabs hug
 * their labels at the start, and under them the chosen list.
 *
 *   - My posts and Saved are the design's cards: the cover with the title on a
 *     band along its foot (`ProfilePostCard`).
 *   - Going and Requested keep the fuller card, since what matters there is
 *     when and where, and how the person stands with it (Going, Request sent,
 *     Waitlisted).
 *
 * A page at a time, with "Show more": the screen scrolls as a whole, so a list
 * does not page itself on scroll. A list is asked for when its tab is opened.
 */
function ProfileLists({
  lists,
  onOpenPost,
}: {
  lists: ReturnType<typeof useOwnProfileLists>;
  onOpenPost: (postId: string) => void;
}) {
  const copy = profileViewCopy.lists;
  const tab = lists.tab;
  const empty =
    tab === 'posts'
      ? copy.emptyPosts
      : tab === 'saved'
        ? copy.emptySaved
        : tab === 'going'
          ? copy.emptyGoing
          : copy.emptyRequested;
  return (
    <View style={{ gap: 16 }}>
      <UnderlineTabs hug options={LIST_TABS} value={tab} onChange={lists.setTab} />
      {lists.loading ? (
        <ActivityCardSkeleton label={copy.loading} />
      ) : lists.failed ? (
        <View style={{ gap: 12, alignItems: 'center', paddingVertical: 16 }}>
          <Text variant="bodySm" tone="muted" className="text-center">
            {copy.failed[tab]}
          </Text>
          <Button label={copy.retry} variant="secondary" size="sm" onPress={lists.retry} />
        </View>
      ) : lists.items.length === 0 ? (
        <Text variant="bodySm" tone="muted" className="py-16 text-center" accessibilityLiveRegion="polite">
          {empty}
        </Text>
      ) : (
        <>
          {lists.items.map(({ activity, state }) =>
            state ? (
              <ActivityCard
                key={activity.id}
                activity={activity}
                status={state}
                onPress={() => onOpenPost(activity.id)}
              />
            ) : (
              <ProfilePostCard key={activity.id} activity={activity} onPress={() => onOpenPost(activity.id)} />
            ),
          )}
          {lists.hasMore ? (
            <Button label={copy.more} variant="secondary" loading={lists.loadingMore} onPress={lists.loadMore} />
          ) : null}
        </>
      )}
    </View>
  );
}
