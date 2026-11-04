import { TouchableOpacity, View } from 'react-native';

import { Avatar, SkeletonBlock, SkeletonPulse, Text } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

/**
 * The person at the top of Settings (Figma: "Maya Chen / @mayawanders"): photo,
 * name and handle in a rounded card that hugs its content. With `subtitle` it
 * is Edit profile's "Profile Photo / Change photo" card. Tappable when `onPress`.
 */
export function ProfileChip({
  name,
  handle,
  avatarUrl,
  avatarName,
  subtitle,
  loading = false,
  onPress,
  accessibilityLabel,
}: {
  name: string;
  handle?: string | null;
  avatarUrl: string | null;
  /** Whose initial stands in for a missing photo, when the title is not their name. */
  avatarName?: string;
  /** A teal action line instead of the handle ("Change photo"). */
  subtitle?: string;
  loading?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const body = (
    <View
      style={{
        alignSelf: 'flex-start',
        maxWidth: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 14,
        paddingRight: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.surfaceMuted,
      }}
    >
      {loading ? (
        <SkeletonPulse>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <SkeletonBlock width={56} height={56} radius={28} />
            <View style={{ gap: 6 }}>
              <SkeletonBlock width={120} height={16} />
              <SkeletonBlock width={90} height={12} />
            </View>
          </View>
        </SkeletonPulse>
      ) : (
        <>
          <Avatar name={avatarName || name || '?'} uri={avatarUrl} size={56} />
          <View style={{ flexShrink: 1, gap: 2 }}>
            <Text variant="headingSm" numberOfLines={2}>
              {name}
            </Text>
            {subtitle ? (
              <Text variant="bodySm" tone="primary">
                {subtitle}
              </Text>
            ) : handle ? (
              <Text variant="bodySm" tone="muted">
                @{handle}
              </Text>
            ) : null}
          </View>
        </>
      )}
    </View>
  );
  if (!onPress) return body;
  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? name}
      style={{ alignSelf: 'flex-start', maxWidth: '100%' }}
    >
      {body}
    </TouchableOpacity>
  );
}
