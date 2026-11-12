import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { TouchableOpacity, View } from 'react-native';

import { Tag, Text, type TagTone } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

import type { ProfileActivity } from '../../domain/entities/PublicProfile';
import { formatDay, formatTime } from '../profileFormat';
import { profileViewCopy } from '../profileViewCopy';

/** How the person stands with the post, as its second tag says. */
export type ActivityStatus = 'hosting' | 'completed' | 'going' | 'requested' | 'waitlisted';

const STATUS_TAG: Record<ActivityStatus, { label: string; tone: TagTone }> = {
  hosting: { label: profileViewCopy.hostingTag, tone: 'success' },
  completed: { label: profileViewCopy.completedTag, tone: 'success' },
  going: { label: profileViewCopy.goingTag, tone: 'success' },
  requested: { label: profileViewCopy.requestedTag, tone: 'pending' },
  // Like a request, still waiting to get in.
  waitlisted: { label: profileViewCopy.waitlistedTag, tone: 'pending' },
};

/**
 * A post on a profile (Figma Other User, "A weekend in Barcelona"): the cover,
 * the type and status tags (Hosting, Completed, Going, Request sent, Waitlisted), the city
 * and country in caps when the post has a place (`localityLabel`), the title, the day and start time, the place,
 * how many are joining, and "View plan ›". The whole card opens the post.
 */
export function ActivityCard({
  activity,
  status,
  onPress,
}: {
  activity: ProfileActivity;
  status: ActivityStatus;
  onPress: () => void;
}) {
  const theme = useTheme();
  const copy = profileViewCopy.activities;
  const day = formatDay(activity.startAt);
  const time = formatTime(activity.startAt);
  const tag = STATUS_TAG[status];
  // Locked to this reader (MOB-077): a hint of the photo, why, and the paywall on tap.
  const locked = activity.lockReason;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[activity.title, activity.locality?.label, day, activity.placeName]
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
            blurRadius={locked ? 24 : undefined}
          />
        ) : null}
      </View>
      <View style={{ padding: 16, gap: 6 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <Tag label={profileViewCopy.types[activity.type]} tone="outline" />
          <Tag label={tag.label} tone={tag.tone} />
        </View>
        {activity.locality ? (
          <Text variant="labelXs" tone="muted" style={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
            {activity.locality.label}
          </Text>
        ) : null}
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
          {locked ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexGrow: 1, flexShrink: 1 }}>
              <Ionicons name="lock-closed" size={14} color={theme.muted} />
              <Text variant="bodySm" tone="muted" style={{ flexShrink: 1 }}>
                {copy.locked[locked]}
              </Text>
            </View>
          ) : (
            <Text variant="bodySm" style={{ flexGrow: 1 }}>
              {copy.joining(activity.goingCount)}
            </Text>
          )}
          <Text variant="labelSm" tone="primary">
            {locked ? `${copy.goPro} ›` : `${copy.view[activity.type]} ›`}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
