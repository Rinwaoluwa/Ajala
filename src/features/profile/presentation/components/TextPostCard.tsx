import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { TouchableOpacity, View } from 'react-native';

import { Avatar, SvgIcon, Text, VectorIcon } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { useTypeColors } from '@shared/theme/postTypeColors';

import type { ProfileActivity } from '../../domain/entities/PublicProfile';
import { formatDay, formatTime } from '../profileFormat';
import { profileViewCopy } from '../profileViewCopy';

const AVATAR = 40;

/**
 * A post of words alone: who, the words, then when, where and how many. Used for
 * every post without a photo in a profile's activity lists (another person's
 * Hosting, Attending and Upcoming) through `ActivityCard`, which passes the
 * post's standing (Hosting, Going…) as `badge`. Nothing stands in for the
 * photo: a block of the type's colour in a cover's place read as a photo that
 * never loaded.
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
