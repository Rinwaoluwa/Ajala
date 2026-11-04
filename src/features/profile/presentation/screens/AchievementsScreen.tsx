import { useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CenteredHeader,
  EmptyState,
  LoadingRing,
  PillTabs,
  Screen,
  SegmentedControl,
  Text,
  enterRise,
} from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER } from '@shared/theme';

import type { BadgeCategory, BadgeProgress } from '../../domain/rules/achievementRules';
import { BadgeSheet } from '../components/BadgeSheet';
import { BadgeTile } from '../components/BadgeTile';
import { StampsView } from '../components/StampsView';
import { useAchievements } from '../hooks/useAchievements';
import { profileViewCopy } from '../profileViewCopy';

/**
 * Achievements (Figma Badges and Stamps, light and dark).
 *
 * Badges: "8 badges earned · 5 achievements in progress" with a trophy, the
 * filter pills, and the grid — two to a row at normal sizes, one when the text
 * is large or the screen narrow (flex rows, never summed widths). A badge opens
 * its sheet.
 *
 * Stamps: one per city the person joined something in (`StampsView`).
 *
 * Everything is worked out from the attended history on the phone — there is
 * no achievements API (API map §12; `achievementRules`).
 */

type View_ = 'badges' | 'stamps';
const FILTERS: { value: BadgeCategory | 'all'; label: string }[] = [
  { value: 'all', label: profileViewCopy.badges.filters.all },
  { value: 'events', label: profileViewCopy.badges.filters.events },
  { value: 'groups', label: profileViewCopy.badges.filters.groups },
  { value: 'plans', label: profileViewCopy.badges.filters.plans },
];

export function AchievementsScreen({ onBack, onExplore }: { onBack: () => void; onExplore: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const vm = useAchievements();
  const [view, setView] = useState<View_>('badges');
  const [open, setOpen] = useState<BadgeProgress | null>(null);
  const copy = profileViewCopy.badges;
  const columns = width / Math.max(fontScale, 1) >= 340 ? 2 : 1;
  const rows: BadgeProgress[][] = [];
  for (let i = 0; i < vm.badges.length; i += columns) rows.push(vm.badges.slice(i, i + columns));

  return (
    <Screen edges={['top']} padded={false}>
      <View className="px-20 pt-8" style={{ gap: 16 }}>
        <CenteredHeader title={copy.title} onBack={onBack} />
        <SegmentedControl
          options={[
            { value: 'badges', label: copy.tabBadges },
            { value: 'stamps', label: copy.tabStamps },
          ]}
          value={view}
          onChange={setView}
        />
      </View>

      {vm.loading ? (
        <View className="flex-1 items-center justify-center">
          <LoadingRing size={48} accessibilityLabel="Loading achievements" />
        </View>
      ) : vm.failed ? (
        <View className="flex-1 justify-center px-20">
          <EmptyState
            title={profileViewCopy.failed.title}
            action={{ label: profileViewCopy.failed.retry, onPress: vm.retry, variant: 'primary' }}
          />
        </View>
      ) : view === 'badges' ? (
        <Animated.View key="badges" entering={FadeIn.duration(200)} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
            <View className="px-20 mt-16">
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.card,
                  padding: 16,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text variant="headingMd">{copy.earnedCount(vm.earned)}</Text>
                  <Text variant="bodySm" tone="muted">
                    {copy.inProgressCount(vm.inProgress)}
                  </Text>
                </View>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    borderWidth: 1,
                    borderColor: theme.accent,
                    backgroundColor: '#FFF8E6',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 20 }} maxFontSizeMultiplier={1.2}>
                    🏆
                  </Text>
                </View>
              </View>
            </View>
            <View className="mt-16">
              <PillTabs options={FILTERS} value={vm.filter} onChange={vm.setFilter} />
            </View>
            <View style={{ height: 1, backgroundColor: theme.border, marginTop: 12 }} />
            <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 16, gap: 12 }}>
              {vm.earned === 0 && vm.inProgress === 0 ? (
                <View style={{ paddingBottom: 8 }}>
                  <EmptyState title={copy.emptyTitle} body={copy.emptyBody} />
                </View>
              ) : null}
              {rows.map((row, r) => (
                <Animated.View
                  key={r}
                  entering={r < 3 ? enterRise(r * 60) : undefined}
                  style={{ flexDirection: 'row', gap: 12 }}
                >
                  {row.map((p) => (
                    <BadgeTile key={p.badge.id} progress={p} onPress={() => setOpen(p)} />
                  ))}
                  {row.length < columns ? <View style={{ flex: 1 }} /> : null}
                </Animated.View>
              ))}
            </View>
          </ScrollView>
        </Animated.View>
      ) : (
        <Animated.View key="stamps" entering={FadeIn.duration(200)} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: SCREEN_GUTTER, paddingBottom: insets.bottom + 32 }}>
            {vm.stamps.length ? (
              <StampsView stamps={vm.stamps} />
            ) : (
              <EmptyState
                title={profileViewCopy.stamps.emptyTitle}
                body={profileViewCopy.stamps.emptyBody}
                action={{ label: copy.exploreMore, onPress: onExplore }}
              />
            )}
          </ScrollView>
        </Animated.View>
      )}

      <BadgeSheet
        progress={open}
        onDismiss={() => setOpen(null)}
        onExplore={() => {
          setOpen(null);
          onExplore();
        }}
      />
    </Screen>
  );
}
