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
import { ProfileHero } from '../components/ProfileHero';
import { RoundIconButton } from '../components/RoundIconButton';
import { TravelDetails } from '../components/TravelDetails';
import { useOwnProfile } from '../hooks/useOwnProfile';
import { profileViewCopy } from '../profileViewCopy';
import { profileLink, shareProfile } from '../shareProfile';

/**
 * The Profile tab (Figma Own Profile, "Maya Chen"): the Ajala logo with the
 * bell and settings on glass; the hero (photo, name, @handle, city, Meetups ·
 * Countries · Streak, interests); Edit profile and share; the bio; "Travel
 * details" (languages, travel style, favourite places, links, Saved
 * activities); Featured Photos; and the Achievements preview.
 *
 * It has no lists of posts (product, 25 Nov). The design drew My posts and
 * Saved at its foot, and Going and Requested followed them; My posts is now a
 * pill on Trips, Going and Requested are Trips' Upcoming and Requests, and
 * Saved is the "Saved activities" row in Travel details.
 *
 * From `GET /me` (shared with Edit profile and setup) and the attended
 * history. Sections with nothing to show are left out rather than drawn empty.
 * Pull to refresh asks again.
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
      </ScrollView>
    </Screen>
  );
}
