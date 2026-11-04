import { Image } from 'expo-image';
import { TouchableOpacity, View } from 'react-native';

import { Tag, Text } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

import type { ProfileActivity } from '../../domain/entities/PublicProfile';
import { formatDay, formatTime } from '../profileFormat';
import { profileViewCopy } from '../profileViewCopy';

/**
 * A post on a profile (Figma Other User, "A weekend in Barcelona"): the cover,
 * the type and Hosting / Completed tags, the city in caps, the title, the day
 * and start time, the place, how many are joining, and "View plan ›". The whole
 * card opens the post.
 */
export function ActivityCard({
  activity,
  status,
  onPress,
}: {
  activity: ProfileActivity;
  status: 'hosting' | 'completed';
  onPress: () => void;
}) {
  const theme = useTheme();
  const copy = profileViewCopy.activities;
  const day = formatDay(activity.startAt);
  const time = formatTime(activity.startAt);
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[activity.title, activity.city.label, day, activity.placeName]
        .filter(Boolean)
        .join(', ')}
      style={{
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.card,
        overflow: 'hidden',
      }}
    >
      <View style={{ aspectRatio: 16 / 7, backgroundColor: theme.skeleton }}>
        {activity.imageUrl ? (
          <Image
            source={{ uri: activity.imageUrl }}
            style={{ flex: 1 }}
            contentFit="cover"
            transition={200}
          />
        ) : null}
      </View>
      <View style={{ padding: 16, gap: 6 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <Tag label={profileViewCopy.types[activity.type]} tone="outline" />
          <Tag
            label={status === 'hosting' ? profileViewCopy.hostingTag : profileViewCopy.completedTag}
            tone="success"
          />
        </View>
        <Text variant="labelXs" tone="muted" style={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
          {activity.city.label}
        </Text>
        <Text variant="headingSm">{activity.title}</Text>
        {day ? (
          <Text variant="bodySm" tone="muted">
            {time ? `${day} · Starts ${time}` : day}
          </Text>
        ) : null}
        {activity.placeName ? (
          <Text variant="bodySm" tone="muted">
            {activity.placeName}
          </Text>
        ) : null}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            columnGap: 12,
            rowGap: 4,
            marginTop: 4,
          }}
        >
          {/* Grows to push the link right; at large text the link wraps under it instead of clipping. */}
          <Text variant="bodySm" style={{ flexGrow: 1 }}>
            {copy.joining(activity.goingCount)}
          </Text>
          <Text variant="labelSm" tone="primary">
            {`${copy.view[activity.type]} ›`}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
