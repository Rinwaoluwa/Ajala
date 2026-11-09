import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { TouchableOpacity, View } from 'react-native';

import { Text } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

/**
 * "Date & Time / Sunday, Oct 18 · 6:30 AM" and "Location / Erin-Ijesha, Osun
 * State" (Figma post detail): a pale card with a mint icon square, a muted
 * label and the value. With `onPress` the value is teal and a chevron shows.
 * `note` is a line under the value: teal for "Repeats weekly", muted
 * (`noteTone`) for a place's address.
 * `StatTile` is the half-width version for Price and Joined.
 */
export function InfoRow({
  icon,
  label,
  value,
  note,
  noteTone = 'primary',
  onPress,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  note?: string | null;
  noteTone?: 'primary' | 'muted';
  onPress?: () => void;
  hint?: string;
}) {
  const theme = useTheme();
  const body = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderRadius: 16,
        padding: 14,
        backgroundColor: theme.surfaceMuted,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          backgroundColor: theme.selectedFill,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodySm" tone="muted">
          {label}
        </Text>
        <Text variant="bodyMd" tone={onPress ? 'primary' : 'default'}>
          {value}
        </Text>
        {note ? (
          <Text variant="bodyXs" tone={noteTone}>
            {note}
          </Text>
        ) : null}
      </View>
      {onPress ? (
        // A React Native glyph rather than a self-sizing native one: it stays centred in the row
        // when the value wraps onto a second line, where the native view was left below the card.
        <Ionicons name="chevron-forward" size={16} color={theme.muted} importantForAccessibility="no" />
      ) : null}
    </View>
  );
  if (!onPress)
    return (
      <View accessible accessibilityLabel={[`${label}: ${value}`, note].filter(Boolean).join(', ')}>
        {body}
      </View>
    );
  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[`${label}: ${value}`, note].filter(Boolean).join(', ')}
      accessibilityHint={hint}
    >
      {body}
    </TouchableOpacity>
  );
}

export function StatTile({ label, value, note }: { label: string; value: string; note?: string | null }) {
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={[label, value, note].filter(Boolean).join(', ')}
      style={{ flex: 1, borderRadius: 16, padding: 16, gap: 4, backgroundColor: theme.surfaceMuted }}
    >
      <Text variant="bodySm" tone="muted">
        {label}
      </Text>
      <Text variant="headingSm">{value}</Text>
      {note ? (
        <Text variant="bodyXs" tone="primary">
          {note}
        </Text>
      ) : null}
    </View>
  );
}
