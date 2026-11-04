import Ionicons from '@expo/vector-icons/Ionicons';
import { Host } from '@expo/ui';
import { Image } from 'expo-image';
import { Linking, RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  EmptyState,
  LoadingRing,
  NativeIcon,
  Screen,
  Text,
  VectorIcon,
  icons,
} from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER, palette } from '@shared/theme';

import type { MyProfile } from '../../domain/entities/Profile';
import { LANGUAGES } from '../../domain/rules/profileSetupRules';
import { AchievementsPreview } from '../components/AchievementsPreview';
import { InterestPills, ProfileHero } from '../components/ProfileHero';
import { RoundIconButton } from '../components/RoundIconButton';
import { useOwnProfile } from '../hooks/useOwnProfile';
import { profileViewCopy } from '../profileViewCopy';
import { profileLink, shareProfile } from '../shareProfile';

/**
 * The Profile tab (Figma Own Profile, "@mayawanders"): the handle with settings
 * and messages, the hero (photo, counters, name, pronouns, city, tagline, bio,
 * interests), Edit profile and share, "A little more about me", Saved
 * activities, Featured photos and the Achievements preview.
 *
 * From `GET /me` (shared with Edit profile and setup) and the attended history.
 * Sections with nothing to show are left out rather than drawn empty. Pull to
 * refresh asks again.
 */

const TAB_BAR_CLEARANCE = 120;

export type OwnProfileScreenProps = {
  onSettings: () => void;
  onMessages: () => void;
  onEditProfile: () => void;
  onSaved: () => void;
  onAchievements: () => void;
};

export function OwnProfileScreen(props: OwnProfileScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const vm = useOwnProfile();
  const copy = profileViewCopy;

  if (vm.loading) {
    return (
      <Screen edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <LoadingRing size={48} accessibilityLabel="Loading your profile" />
        </View>
      </Screen>
    );
  }
  if (vm.failed || !vm.profile) {
    return (
      <Screen edges={['top']}>
        <View className="flex-1 justify-center">
          <EmptyState
            title={copy.failed.title}
            action={{ label: copy.failed.retry, onPress: vm.retry, variant: 'primary' }}
          />
        </View>
      </Screen>
    );
  }

  const p = vm.profile;
  const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || (p.handle ?? '');
  const link = profileLink(p.handle, p.id);

  return (
    <Screen edges={['top']} padded={false}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingBottom: TAB_BAR_CLEARANCE + insets.bottom,
          gap: 24,
        }}
        refreshControl={
          <RefreshControl refreshing={vm.refreshing} onRefresh={vm.retry} tintColor={theme.primary} />
        }
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8 }}>
          <Text variant="headingMd" tone="primary" style={{ flex: 1 }} numberOfLines={1}>
            {p.handle ? `@${p.handle}` : name}
          </Text>
          <RoundIconButton label={copy.settings} onPress={props.onSettings}>
            <Host matchContents pointerEvents="none" ignoreSafeArea="all">
              <NativeIcon source={icons.settings} size={18} color={theme.foreground} />
            </Host>
          </RoundIconButton>
          <RoundIconButton label={copy.messages} onPress={props.onMessages}>
            <VectorIcon name="chat" size={20} color={theme.foreground} />
          </RoundIconButton>
        </View>

        <ProfileHero
          name={name}
          avatarUrl={p.avatarUrl}
          pronouns={p.about?.pronouns}
          city={p.homeCity?.label}
          tagline={p.about?.tagline}
          bio={p.about?.bio}
          interests={p.interests}
          counters={vm.derived?.counters ?? null}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Button label={copy.editProfile} size="lg" fullWidth onPress={props.onEditProfile} />
          </View>
          <RoundIconButton label={copy.shareProfile} size={50} onPress={() => shareProfile(name, link)}>
            <Host matchContents pointerEvents="none" ignoreSafeArea="all">
              <NativeIcon source={icons.share} size={18} color={theme.foreground} />
            </Host>
          </RoundIconButton>
        </View>

        <AboutMe profile={p} />

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={props.onSaved}
          accessibilityRole="button"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            minHeight: 48,
            borderRadius: 999,
            backgroundColor: theme.surfaceMuted,
          }}
        >
          <Ionicons name="bookmark" size={18} color={palette.teal} />
          <Text variant="labelMd">{copy.savedRow}</Text>
        </TouchableOpacity>

        <Photos profile={p} />

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

function AboutMe({ profile }: { profile: MyProfile }) {
  const copy = profileViewCopy;
  const languages = profile.languages.map(
    (code) => LANGUAGES.find((l) => l.value === code)?.label ?? code.toUpperCase(),
  );
  const links = profile.about?.socialLinks;
  const rows: { label: string; value: string; url: string }[] = [];
  const handle = (v: string) => v.replace(/^@/, '');
  if (links?.instagram) {
    rows.push({
      label: copy.instagram,
      value: `@${handle(links.instagram)}`,
      url: `https://instagram.com/${handle(links.instagram)}`,
    });
  }
  if (links?.tiktok) {
    rows.push({
      label: copy.tiktok,
      value: `@${handle(links.tiktok)}`,
      url: `https://www.tiktok.com/@${handle(links.tiktok)}`,
    });
  }
  if (links?.website) {
    const site = links.website;
    rows.push({
      label: copy.website,
      value: site.replace(/^https?:\/\//, ''),
      url: site.startsWith('http') ? site : `https://${site}`,
    });
  }
  if (!languages.length && !rows.length) return null;

  return (
    <View style={{ gap: 10 }}>
      <Text variant="headingSm" accessibilityRole="header">
        {copy.aboutMe}
      </Text>
      {languages.length ? (
        <>
          <Text variant="bodySm" tone="muted">
            {copy.languages}
          </Text>
          <InterestPills labels={languages} />
        </>
      ) : null}
      {rows.length ? (
        <>
          <Text variant="bodySm" tone="muted" className="mt-4">
            {copy.findMe}
          </Text>
          {rows.map((r) => (
            <TouchableOpacity
              key={r.label}
              activeOpacity={0.6}
              onPress={() => void Linking.openURL(r.url).catch(() => undefined)}
              accessibilityRole="link"
            >
              <Text variant="bodySm" tone="primary">{`${r.label}  ·  ${r.value}`}</Text>
            </TouchableOpacity>
          ))}
        </>
      ) : null}
    </View>
  );
}

/** Two large photos, then up to three smaller — flex rows, so they share the width at any size. */
function Photos({ profile }: { profile: MyProfile }) {
  const theme = useTheme();
  const photos = profile.about?.photos ?? [];
  const copy = profileViewCopy.photos;
  const rows = [photos.slice(0, 2), photos.slice(2, 5)].filter((r) => r.length);
  return (
    <View style={{ gap: 10 }}>
      <View>
        <Text variant="headingSm" accessibilityRole="header">
          {copy.title}
        </Text>
        <Text variant="bodySm" tone="muted">
          {photos.length ? copy.count(photos.length) : copy.empty}
        </Text>
      </View>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: 8 }}>
          {row.map((photo) => (
            <View
              key={photo.id}
              style={{
                flex: 1,
                aspectRatio: r === 0 ? 1.15 : 0.95,
                borderRadius: 14,
                overflow: 'hidden',
                backgroundColor: theme.skeleton,
              }}
            >
              <Image
                source={{ uri: photo.thumbUrl }}
                style={{ flex: 1 }}
                contentFit="cover"
                transition={200}
              />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
