import { useState } from 'react';
import { Alert, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';

import { EmptyState, PillTabs, SkeletonBlock, SkeletonPulse, Text } from '@shared/components';

import type { Draft } from '../../domain/entities/Settings';
import { isSettingsError } from '../../domain/entities/SettingsError';
import { filterDrafts, type DraftFilter } from '../../domain/rules/settingsRules';
import { DraftCard } from '../components/DraftCard';
import { LoadFailed } from '../components/LoadFailed';
import { SettingsFrame } from '../components/SettingsFrame';
import { settingsCopy, settingsErrors } from '../copy';
import { useDrafts } from '../hooks/useSettingsData';

/**
 * Drafts (Figma Settings / Drafts, light and dark): "Saved drafts", pills to show
 * one type, and a card per draft (`GET /me/posts?status=draft`, filtered on the
 * phone — API map §10). Continue editing opens the create wizard on that draft;
 * Delete asks first, then the card folds away.
 */
const FILTERS: readonly { value: DraftFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'meetup', label: 'Meetups' },
  { value: 'event', label: 'Events' },
  { value: 'plan', label: 'Plans' },
  { value: 'group', label: 'Groups' },
];

export function DraftsScreen({
  onBack,
  onContinue,
}: {
  onBack: () => void;
  onContinue: (draft: Draft) => void;
}) {
  const copy = settingsCopy.drafts;
  const drafts = useDrafts();
  const [filter, setFilter] = useState<DraftFilter>('all');
  const shown = drafts.drafts ? filterDrafts(drafts.drafts, filter) : null;

  const confirmDelete = (draft: Draft) =>
    Alert.alert(copy.deleteTitle, copy.deleteBody, [
      { text: settingsCopy.hub.cancel, style: 'cancel' },
      {
        text: copy.delete,
        style: 'destructive',
        onPress: () =>
          void drafts.remove(draft.id).catch((e: unknown) => {
            Alert.alert(settingsErrors[isSettingsError(e) ? e.code : 'unknown']);
          }),
      },
    ]);

  return (
    <SettingsFrame title={copy.title} onBack={onBack}>
      <View style={{ gap: 6 }}>
        <Text variant="headingMd" accessibilityRole="header">
          {copy.heading}
        </Text>
        <Text variant="bodySm" tone="muted">
          {copy.body}
        </Text>
      </View>
      <View style={{ marginHorizontal: -20 }}>
        <PillTabs options={FILTERS} value={filter} onChange={setFilter} look="outline" />
      </View>
      {drafts.failed ? (
        <LoadFailed onRetry={drafts.retry} />
      ) : !shown ? (
        <SkeletonPulse>
          <View style={{ gap: 16 }}>
            {[0, 1, 2].map((i) => (
              <SkeletonBlock key={i} height={170} radius={18} />
            ))}
          </View>
        </SkeletonPulse>
      ) : shown.length === 0 ? (
        <EmptyState
          title={copy.emptyTitle}
          body={
            filter === 'all'
              ? copy.emptyBody
              : copy.emptyFiltered(FILTERS.find((f) => f.value === filter)?.label.toLowerCase() ?? '')
          }
        />
      ) : (
        <View style={{ gap: 16 }}>
          {shown.map((draft) => (
            <Animated.View
              key={draft.id}
              exiting={FadeOut.duration(180)}
            >
              <DraftCard
                draft={draft}
                deleting={drafts.removing === draft.id}
                onContinue={() => onContinue(draft)}
                onDelete={() => confirmDelete(draft)}
              />
            </Animated.View>
          ))}
        </View>
      )}
    </SettingsFrame>
  );
}
