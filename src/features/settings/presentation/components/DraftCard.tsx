import { TouchableOpacity, View, useColorScheme } from 'react-native';

import { Host, NativeIcon, NativeSpinner, Text, icons } from '@shared/components';
import { useFontScale } from '@shared/hooks/useFontScale';
import { useTheme } from '@shared/hooks/useTheme';
import { palette } from '@shared/theme';

import type { Draft } from '../../domain/entities/Settings';
import { editedAgo } from '../../domain/rules/settingsRules';
import { settingsCopy } from '../copy';

/**
 * A saved draft (Figma Settings / Drafts): its type in teal (Marigold on dark),
 * the title, "Edited 3 days ago", then Continue editing (a pale pill with a
 * pencil) and Delete (red, outlined), side by side. They stack only at large
 * text sizes: wrapping by width alone dropped Delete under Continue editing on
 * Android phones whose default text is a little larger.
 */
const TYPE_LABEL: Record<Draft['type'], string> = {
  meetup: 'Meetup',
  event: 'Event',
  plan: 'Plan',
  group: 'Group',
};

export function DraftCard({
  draft,
  deleting,
  onContinue,
  onDelete,
}: {
  draft: Draft;
  deleting: boolean;
  onContinue: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const copy = settingsCopy.drafts;
  const stacked = useFontScale() > 1.3;
  return (
    <View
      style={{
        borderRadius: 18,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.card,
        padding: 20,
        gap: 6,
      }}
    >
      <Text variant="labelMd" style={{ color: dark ? theme.accent : palette.teal }}>
        {TYPE_LABEL[draft.type]}
      </Text>
      <Text variant="headingSm">{draft.title || 'Untitled'}</Text>
      <Text variant="bodySm" tone="muted">
        {editedAgo(draft.updatedAt)}
      </Text>
      <View
        style={{
          marginTop: 12,
          flexDirection: stacked ? 'column' : 'row',
          alignItems: stacked ? 'flex-start' : 'center',
          gap: 10,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.6}
          onPress={onContinue}
          accessibilityRole="button"
          accessibilityLabel={`${copy.continue}: ${draft.title}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            flexShrink: 1,
            paddingHorizontal: 16,
            minHeight: 44,
            borderRadius: 999,
            backgroundColor: dark ? palette.white : theme.surfaceMuted,
          }}
        >
          <Host matchContents pointerEvents="none" ignoreSafeArea="all">
            <NativeIcon source={icons.edit} size={14} color={palette.ink} />
          </Host>
          <Text variant="labelMd" numberOfLines={1} style={{ flexShrink: 1, color: palette.ink }}>
            {copy.continue}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.6}
          onPress={onDelete}
          disabled={deleting}
          accessibilityRole="button"
          accessibilityLabel={`${copy.delete}: ${draft.title}`}
          accessibilityState={{ busy: deleting }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            flexShrink: 1,
            paddingHorizontal: 16,
            minHeight: 44,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: dark ? 'transparent' : theme.border,
            backgroundColor: dark ? theme.surfaceMuted : 'transparent',
          }}
        >
          <Host matchContents pointerEvents="none" ignoreSafeArea="all">
            {deleting ? (
              <NativeSpinner size={14} color={theme.danger} />
            ) : (
              <NativeIcon source={icons.trash} size={14} color={theme.danger} />
            )}
          </Host>
          <Text variant="labelMd" numberOfLines={1} style={{ flexShrink: 1, color: theme.danger }}>
            {copy.delete}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
