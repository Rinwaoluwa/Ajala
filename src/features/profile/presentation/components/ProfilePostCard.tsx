import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { TouchableOpacity, View } from 'react-native';

import { Avatar, SvgIcon, Text, VectorIcon } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { palette } from '@shared/theme';
import { useTypeColors } from '@shared/theme/postTypeColors';

import type { ProfileActivity } from '../../domain/entities/PublicProfile';
import { formatDay, formatTime } from '../profileFormat';
import { profileViewCopy } from '../profileViewCopy';

/**
 * A post on the own profile's My posts and Saved. The whole card opens the post.
 *
 * With a photo (Figma Own Profile, "My lagoon adventure"): its cover across the
 * width, and its title on a dark band along the foot of the cover.
 *
 * Without one (photos are optional), the words are the post, so it is laid out
 * as a post of words, the way X sets one: whose it is first, their photo to the
 * left of their name; the words on their own lines under that; then what an
 * activity needs said about it (when, where, how many are going) where X has
 * its row of counts. Nothing stands in for the photo. It had the type's colour
 * filling a cover's space, a large empty block with one line at its foot; a card
 * with no picture should not keep room for one.
 *
 * A post locked to this reader (a saved Plan without Pro, MOB-077) shows only a
 * blur of its cover and a lock by the title, or the lock and why in the place of
 * the details.
 */
export function ProfilePostCard({ activity, onPress }: { activity: ProfileActivity; onPress: () => void }) {
  const locked = activity.lockReason;
  const day = formatDay(activity.startAt);
  const label = [
    activity.title,
    profileViewCopy.types[activity.type],
    activity.host.name || null,
    day,
    locked ? profileViewCopy.activities.locked[locked] : activity.placeName,
  ]
    .filter(Boolean)
    .join(', ');
  return activity.imageUrl ? (
    <CoverCard activity={activity} imageUrl={activity.imageUrl} label={label} onPress={onPress} />
  ) : (
    <TextPostCard activity={activity} accessibilityLabel={label} onPress={onPress} />
  );
}

/** The design's card: the cover, with the title on a band along its foot. */
function CoverCard({
  activity,
  imageUrl,
  label,
  onPress,
}: {
  activity: ProfileActivity;
  imageUrl: string;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const locked = activity.lockReason;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: theme.skeleton }}
    >
      <View style={{ aspectRatio: 1.95, minHeight: 150 }}>
        <Image
          source={{ uri: imageUrl }}
          style={{ flex: 1 }}
          contentFit="cover"
          transition={200}
          blurRadius={locked ? 24 : undefined}
        />
      </View>
      {/* The title keeps to two lines; at a large text size the band grows up over the cover. */}
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

const AVATAR = 40;

/**
 * A post of words alone: who, the words, then when, where and how many. Used for
 * every post without a photo on a profile: My posts and Saved here, and the
 * activity lists (another person's profile, Going and Requested) through
 * `ActivityCard`, which passes the post's standing (Hosting, Going…) as `badge`.
 */
export function TextPostCard({
  activity,
  onPress,
  badge,
  accessibilityLabel,
}: {
  activity: ProfileActivity;
  onPress: () => void;
  /** Beside the type: how the person stands with the post (a `Tag`). */
  badge?: ReactNode;
  accessibilityLabel?: string;
}) {
  const label =
    accessibilityLabel ??
    [activity.title, profileViewCopy.types[activity.type], activity.host.name || null, formatDay(activity.startAt)]
      .filter(Boolean)
      .join(', ');
  const theme = useTheme();
  const typeColors = useTypeColors();
  const copy = profileViewCopy.activities;
  const locked = activity.lockReason;
  const day = formatDay(activity.startAt);
  const time = formatTime(activity.startAt);
  const when = day ? (time ? `${day} · ${time}` : day) : null;
  const where = activity.placeName ?? activity.locality?.label ?? null;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        gap: 12,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.card,
      }}
    >
      {/* The label above names the host: the photo is not read out a second time. */}
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Avatar name={activity.host.name || activity.title} uri={activity.host.avatarUrl} size={AVATAR} />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        {/* Whose it is and what kind of post; they wrap apart at a large text size. */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, rowGap: 2 }}>
          {activity.host.name ? (
            <Text variant="labelMd" numberOfLines={1} style={{ flexShrink: 1 }}>
              {activity.host.name}
            </Text>
          ) : null}
          <Text variant="labelSm" style={{ color: typeColors[activity.type].softLabel }}>
            {profileViewCopy.types[activity.type]}
          </Text>
          {badge}
        </View>
        {/* The words, at reading size. Four lines of a title is every title; it is never cut mid-word. */}
        <Text variant="bodyMd" numberOfLines={4}>
          {activity.title}
        </Text>
        {/* Where X has its counts: what there is to know before opening it. */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 16, rowGap: 6, marginTop: 2 }}>
          {locked ? (
            <Detail icon={<Ionicons name="lock-closed" size={14} color={theme.muted} />} text={copy.locked[locked]} />
          ) : (
            <>
              {when ? <Detail icon={<SvgIcon name="calendar" size={14} tint={theme.muted} />} text={when} /> : null}
              {where ? <Detail icon={<VectorIcon name="pin" size={14} color={theme.muted} />} text={where} /> : null}
              {/* Nobody yet is not a number worth showing, as a count of none is left off a post on X. */}
              {activity.goingCount > 0 ? (
                <Detail
                  icon={<SvgIcon name="users" size={15} tint={theme.muted} />}
                  text={copy.joining(activity.goingCount)}
                />
              ) : null}
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

/** One thing to know about the post: a small glyph and a few words, kept together on a line. */
function Detail({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
      {icon}
      <Text variant="bodySm" tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
        {text}
      </Text>
    </View>
  );
}
