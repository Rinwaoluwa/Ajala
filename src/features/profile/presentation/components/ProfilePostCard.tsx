import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { TouchableOpacity, View } from 'react-native';

import { Text } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { palette } from '@shared/theme';
import { useTypeColors } from '@shared/theme/postTypeColors';

import type { ProfileActivity } from '../../domain/entities/PublicProfile';
import { profileViewCopy } from '../profileViewCopy';

/**
 * A post on the own profile's My posts and Saved (Figma Own Profile, "My lagoon
 * adventure"): its cover across the width, and its title on a dark band along
 * the foot of the cover. The whole card opens the post.
 *
 * A post with no photo (they are optional) has the colour of its type in the
 * cover's place. One locked to this reader (a saved Plan without Pro, MOB-077)
 * shows only a blur of its cover and a lock by the title.
 *
 * The title keeps to two lines; at a large text size the band grows up over the
 * cover rather than the title being cut short.
 */
export function ProfilePostCard({ activity, onPress }: { activity: ProfileActivity; onPress: () => void }) {
  const theme = useTheme();
  const typeColors = useTypeColors();
  const locked = activity.lockReason;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[
        activity.title,
        profileViewCopy.types[activity.type],
        locked ? profileViewCopy.activities.locked[locked] : null,
      ]
        .filter(Boolean)
        .join(', ')}
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        // No photo: the type's own colour, not a grey that reads as loading.
        backgroundColor: activity.imageUrl ? theme.skeleton : typeColors[activity.type].cover,
      }}
    >
      <View style={{ aspectRatio: 1.95, minHeight: 150 }}>
        {activity.imageUrl ? (
          <Image
            source={{ uri: activity.imageUrl }}
            style={{ flex: 1 }}
            contentFit="cover"
            transition={200}
            blurRadius={locked ? 24 : undefined}
          />
        ) : null}
      </View>
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 12,
          paddingVertical: 12,
          borderTopLeftRadius: 10,
          borderTopRightRadius: 10,
          backgroundColor: 'rgba(17,20,23,0.68)',
        }}
      >
        {locked ? <Ionicons name="lock-closed" size={14} color={palette.white} /> : null}
        <Text variant="bodySm" numberOfLines={2} style={{ color: palette.white, flex: 1 }}>
          {activity.title}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
