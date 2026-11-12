import { useEffect, useState } from 'react';
import { Alert, FlatList, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Host,
  BackButton,
  Button,
  EmptyState,
  LoadFailedState,
  LoadingRing,
  NativeIcon,
  NoteCard,
  Screen,
  Text,
  UnderlineTabs,
  icons,
  useListEntrance,
} from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER } from '@shared/theme';

import { isProfileError } from '../../domain/entities/ProfileError';
import { LANGUAGES, travelStyleLabel } from '../../domain/rules/profileSetupRules';
import type { PersonActivityTab } from '../../domain/usecases/ProfileViewUseCases';
import { ActivityCard, type ActivityStatus } from '../components/ActivityCard';
import { FeaturedPhotos } from '../components/FeaturedPhotos';
import { ProfileHero } from '../components/ProfileHero';
import { ProfileOptionsSheet } from '../components/ProfileOptionsSheet';
import { ReportProfileDialog } from '../components/ReportProfileDialog';
import { RoundIconButton } from '../components/RoundIconButton';
import { TravelDetails } from '../components/TravelDetails';
import { profileErrorMessages } from '../copy';
import { usePerson } from '../hooks/usePerson';
import { profileViewCopy } from '../profileViewCopy';
import { copyProfileLink, profileLink, shareProfile } from '../shareProfile';
import { haptics } from '@shared/feedback/haptics';

/**
 * Another traveller's profile (Figma Other User, "@JamesAllen44"): back and
 * the handle, ⋯ for Profile options; the hero (with "Open to meet" when they
 * said so), their bio, "Travel details", Message and Achievements side by side,
 * Featured Photos, a safety note, and "Public activities" — Hosting / Attending,
 * plus Upcoming when they share their plans (`GET /users/:id/plans`) — that
 * loads more as it scrolls.
 *
 * Message hands over to the chat feature (the route file opens its start
 * screen with this person's id). It is not offered on a blocked profile.
 *
 * Profile options: share, copy the link, report (a card over the page) and
 * block (confirmed, then the page closes). Someone already blocked shows a
 * short blocked state with Unblock. A profile the API will not show (suspended,
 * deleted, or they blocked you) is "not available".
 *
 * Not built: Follow — there are no follows in the API or the requirements
 * (API map §12).
 */

const SHEET_HANDOFF_MS = 260;

const TAB_STATUS: Record<PersonActivityTab, ActivityStatus> = {
  hosting: 'hosting',
  attending: 'completed',
  plans: 'going',
};

export type PublicProfileScreenProps = {
  userId: string;
  onBack: () => void;
  /** A locked post (MOB-077) comes with its reason: the paywall, not the post. */
  onOpenPost: (postId: string, lockReason?: 'plan' | 'distance' | null) => void;
  onMessage: () => void;
  /** Their badges and stamps (the Achievements screen for this person), with their first name. */
  onAchievements: (firstName: string) => void;
};

export function PublicProfileScreen({
  userId,
  onBack,
  onOpenPost,
  onMessage,
  onAchievements,
}: PublicProfileScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const vm = usePerson(userId);
  const enterActivity = useListEntrance(vm.items.length > 0);
  const copy = profileViewCopy;
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2200);
    return () => clearTimeout(t);
  }, [notice]);

  // One sheet closes before the next card opens: two system modals cannot change hands at once.
  const after = (fn: () => void) => {
    setOptionsOpen(false);
    setTimeout(fn, SHEET_HANDOFF_MS);
  };

  const header = (title: string) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: SCREEN_GUTTER,
        paddingVertical: 8,
      }}
    >
      <BackButton onPress={onBack} label="Back" />
      <Text variant="headingSm" tone="primary" style={{ flex: 1 }} numberOfLines={1}>
        {title}
      </Text>
      {vm.person ? (
        <RoundIconButton label={copy.more} onPress={() => setOptionsOpen(true)}>
          <Host matchContents pointerEvents="none" ignoreSafeArea="all">
            <NativeIcon source={icons.more} size={18} color={theme.foreground} />
          </Host>
        </RoundIconButton>
      ) : null}
    </View>
  );

  if (vm.loading) {
    return (
      <Screen edges={['top']} padded={false}>
        {header('')}
        <View className="flex-1 items-center justify-center">
          <LoadingRing size={48} accessibilityLabel="Loading profile" />
        </View>
      </Screen>
    );
  }

  if (!vm.person) {
    const notFound = vm.error === 'notFound';
    return (
      <Screen edges={['top']} padded={false}>
        {header('')}
        <View className="flex-1 justify-center px-20">
          {notFound ? (
            <EmptyState icon="person-outline"
              title={copy.unavailable.title}
              body={copy.unavailable.body}
              action={{ label: copy.unavailable.back, onPress: onBack, variant: 'primary' }}
            />
          ) : (
            <LoadFailedState
              kind={vm.error === 'network' ? 'network' : 'server'}
              title={copy.failed.title}
              body={vm.error ? profileErrorMessages[vm.error] : copy.failed.body}
              action={{ label: copy.failed.retry, onPress: vm.retry, variant: 'primary' }}
            />
          )}
        </View>
      </Screen>
    );
  }

  const person = vm.person;
  const first = person.displayName.split(' ')[0] ?? person.displayName;
  const link = profileLink(person.handle, person.id);

  const confirmBlock = () => {
    haptics.warning();
    Alert.alert(copy.block.title(first), copy.block.body, [
      { text: copy.block.cancel, style: 'cancel' },
      {
        text: copy.block.confirm,
        style: 'destructive',
        onPress: () =>
          void vm
            .block()
            .then(onBack, (e: unknown) =>
              Alert.alert(profileErrorMessages[isProfileError(e) ? e.code : 'unknown']),
            ),
      },
    ]);
  };

  const listHeader = (
    <View style={{ gap: 24, paddingBottom: 16 }}>
      <ProfileHero
        name={person.displayName}
        handle={person.handle}
        pronouns={person.about.pronouns}
        avatarUrl={person.avatarUrl}
        city={person.homePlace?.label}
        openToMeetToday={person.openToMeetToday && !person.blockedByMe}
        interests={person.interests}
        counters={vm.derived?.counters ?? null}
      />
      {person.about.tagline || person.about.bio ? (
        <View style={{ gap: 4, marginTop: -4 }}>
          {person.about.tagline ? <Text variant="bodySm">{person.about.tagline}</Text> : null}
          {person.about.bio ? <Text variant="bodySm">{person.about.bio}</Text> : null}
        </View>
      ) : null}
      {person.blockedByMe ? (
        <View style={{ gap: 12 }}>
          <NoteCard title={copy.block.blocked(first)} body={copy.options.unblockBody} />
          <Button
            label={copy.options.unblock}
            variant="secondary"
            loading={vm.blocking}
            onPress={() => void vm.unblock().catch(() => undefined)}
          />
        </View>
      ) : (
        <>
          <TravelDetails
            data={{
              languages: person.languages.map(
                (code) => LANGUAGES.find((l) => l.value === code)?.label ?? code.toUpperCase(),
              ),
              travelStyles: person.travelStyles.map(travelStyleLabel),
              places: person.favouriteDestinations.map((c) => c.label),
              website: person.about.socialLinks.website,
              instagram: person.about.socialLinks.instagram,
              tiktok: person.about.socialLinks.tiktok,
            }}
          />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Button label={copy.message} size="md" fullWidth onPress={onMessage} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label={copy.achievementsButton}
                size="md"
                fullWidth
                // The label follows the scheme: ink on the pale fill, light on the dark one (ink
                // on dark made "Achievements" vanish in dark mode).
                tint={{ fill: theme.surfaceMuted, label: theme.foreground }}
                onPress={() => onAchievements(first)}
              />
            </View>
          </View>
          <FeaturedPhotos photos={person.about.photos ?? []} own={false} name={person.displayName} />
          <NoteCard title={copy.safety.title} body={copy.safety.body} />
          <View style={{ gap: 4 }}>
            <Text variant="headingSm" accessibilityRole="header">
              {copy.activities.title}
            </Text>
            <Text variant="bodySm" tone="muted">
              {copy.activities.body(first)}
            </Text>
          </View>
          <UnderlineTabs
            options={[
              { value: 'hosting' as const, label: copy.activities.hosting },
              { value: 'attending' as const, label: copy.activities.attending },
              ...(person.sharePlans ? [{ value: 'plans' as const, label: copy.activities.plans }] : []),
            ]}
            value={vm.tab}
            onChange={vm.setTab}
          />
        </>
      )}
    </View>
  );

  return (
    <Screen edges={['top']} padded={false}>
      {header(person.handle ? `@${person.handle}` : person.displayName)}
      <FlatList
        data={person.blockedByMe ? [] : vm.items}
        keyExtractor={(a) => a.id}
        ListHeaderComponent={listHeader}
        contentContainerStyle={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingBottom: insets.bottom + 32,
          gap: 16,
        }}
        onEndReached={vm.loadMore}
        onEndReachedThreshold={0.5}
        renderItem={({ item, index }) => (
          <Animated.View entering={enterActivity(index, 3, 40)}>
            <ActivityCard activity={item} status={TAB_STATUS[vm.tab]} onPress={() => onOpenPost(item.id, item.lockReason)} />
          </Animated.View>
        )}
        ListEmptyComponent={
          person.blockedByMe ? null : vm.activityLoading ? (
            <View className="items-center py-24">
              <LoadingRing size={32} accessibilityLabel="Loading activities" />
            </View>
          ) : vm.activityFailed ? (
            <View style={{ gap: 12, alignItems: 'center', paddingVertical: 24 }}>
              <Text variant="bodySm" tone="muted" className="text-center">
                {copy.activities.failed}
              </Text>
              <Button
                label={copy.activities.retry}
                variant="secondary"
                size="sm"
                onPress={vm.retryActivity}
              />
            </View>
          ) : (
            <Text variant="bodySm" tone="muted" className="text-center py-24">
              {vm.tab === 'hosting'
                ? copy.activities.emptyHosting(first)
                : vm.tab === 'plans'
                  ? copy.activities.emptyPlans(first)
                  : copy.activities.emptyAttending(first)}
            </Text>
          )
        }
      />

      {notice ? (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(180)}
          pointerEvents="none"
          style={{
            position: 'absolute',
            alignSelf: 'center',
            bottom: insets.bottom + 24,
            // Never wider than the screen less its gutters, so a wrapped notice keeps its margins.
            maxWidth: width - SCREEN_GUTTER * 2,
            borderRadius: 999,
            paddingHorizontal: 16,
            paddingVertical: 10,
            backgroundColor: theme.foreground,
          }}
          accessibilityLiveRegion="polite"
        >
          <Text variant="labelSm" style={{ color: theme.background }}>
            {notice}
          </Text>
        </Animated.View>
      ) : null}

      <ProfileOptionsSheet
        isPresented={optionsOpen}
        blocked={person.blockedByMe}
        onDismiss={() => setOptionsOpen(false)}
        onShare={() => after(() => shareProfile(person.displayName, link))}
        onCopy={() =>
          after(
            () =>
              void copyProfileLink(person.displayName, link).then(
                (ok) => ok && setNotice(copy.options.copied),
              ),
          )
        }
        onReport={() =>
          after(() => {
            vm.resetReport();
            setReportOpen(true);
          })
        }
        onBlock={() =>
          after(() => (person.blockedByMe ? void vm.unblock().catch(() => undefined) : confirmBlock()))
        }
      />
      <ReportProfileDialog
        isPresented={reportOpen}
        submitting={vm.reporting}
        error={vm.reportError}
        onDismiss={() => setReportOpen(false)}
        onSubmit={(reason, details) =>
          void vm.report(reason, details).then(
            () => {
              setReportOpen(false);
              setNotice(copy.report.sent);
            },
            () => undefined,
          )
        }
      />
    </Screen>
  );
}
