import { RefreshControl, ScrollView, View, useColorScheme } from 'react-native';
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
} from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER, palette } from '@shared/theme';

import { LANGUAGES, travelStyleLabel } from '../../domain/rules/profileSetupRules';
import { AchievementsPreview } from '../components/AchievementsPreview';
import { FeaturedPhotos } from '../components/FeaturedPhotos';
import { ActivityCard } from '../components/ActivityCard';
import { ActivityCardSkeleton } from '../components/ActivityCardSkeleton';
import { ProfileHero } from '../components/ProfileHero';
import { RoundIconButton } from '../components/RoundIconButton';
import { TravelDetails } from '../components/TravelDetails';
import { useOwnProfile } from '../hooks/useOwnProfile';
import type { useMyRsvps } from '../hooks/useMyRsvps';
import { profileViewCopy } from '../profileViewCopy';
import { profileLink, shareProfile } from '../shareProfile';

/**
 * The Profile tab (Figma Own Profile, "Maya Chen"): the Ajala logo with the
 * bell and settings on glass; the hero (photo, name, @handle, city, Meetups ·
 * Countries · Streak, interests); Edit profile and share; the bio; "Travel
 * details" (languages, travel style, favourite places, links, Saved
 * activities); Featured Photos; then the Achievements preview and the Going /
 * Requested tabs.
 *
 * From `GET /me` (shared with Edit profile and setup), the attended history and
 * `GET /me/rsvps`. Sections with nothing to show are left out rather than drawn
 * empty. Pull to refresh asks again.
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
};

export function OwnProfileScreen(props: OwnProfileScreenProps) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
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

        <MyActivities rsvps={vm.rsvps} onOpenPost={props.onOpenPost} />
      </ScrollView>
    </Screen>
  );
}

/**
 * Going / Requested (`GET /me/rsvps`): the posts the person is going to that
 * have not ended, and everything waiting to get in — private posts waiting on
 * a host, then waitlists — each tagged by its list. A page at a time,
 * with "Show more" — the screen scrolls as a whole, so the list does not page
 * itself on scroll.
 */
function MyActivities({
  rsvps,
  onOpenPost,
}: {
  rsvps: ReturnType<typeof useMyRsvps>;
  onOpenPost: (postId: string) => void;
}) {
  const copy = profileViewCopy.myActivities;
  return (
    <View style={{ gap: 16 }}>
      <Text variant="headingSm" accessibilityRole="header">
        {copy.title}
      </Text>
      <UnderlineTabs
        options={[
          { value: 'going', label: copy.going },
          { value: 'requested', label: copy.requested },
        ]}
        value={rsvps.tab}
        onChange={rsvps.setTab}
      />
      {rsvps.loading ? (
        <ActivityCardSkeleton label="Loading your activities" />
      ) : rsvps.failed ? (
        <View style={{ gap: 12, alignItems: 'center', paddingVertical: 16 }}>
          <Text variant="bodySm" tone="muted" className="text-center">
            {copy.failed}
          </Text>
          <Button label={copy.retry} variant="secondary" size="sm" onPress={rsvps.retry} />
        </View>
      ) : rsvps.items.length === 0 ? (
        <Text variant="bodySm" tone="muted" className="py-16 text-center">
          {rsvps.tab === 'going' ? copy.emptyGoing : copy.emptyRequested}
        </Text>
      ) : (
        <>
          {rsvps.items.map(({ activity, state }) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              status={state}
              onPress={() => onOpenPost(activity.id)}
            />
          ))}
          {rsvps.hasMore ? (
            <Button
              label={copy.more}
              variant="secondary"
              loading={rsvps.loadingMore}
              onPress={rsvps.loadMore}
            />
          ) : null}
        </>
      )}
    </View>
  );
}
