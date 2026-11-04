import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text, formatDistance } from '@shared/components';
import { useFontScale } from '@shared/hooks/useFontScale';
import { useTheme } from '@shared/hooks/useTheme';

import type { NearbyMeetup } from '../../domain/entities/Explore';
import { exploreCopy } from '../copy';
import { formatWeekdayTime } from '../format';

/**
 * A card under "Meetups Near You": the cover photo, the title, the place, "Friday ·
 * 7:00 PM", "16 going · 2 km away". It widens with the text-size setting so its
 * lines stay readable, and dips to 98% when pressed.
 */

const BASE_WIDTH = 200;

function MeetupCardComponent({ meetup, onPress }: { meetup: NearbyMeetup; onPress: () => void }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const width = Math.round(BASE_WIDTH * Math.min(useFontScale(), 1.5));
  const pressed = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: reduceMotion ? [] : [{ scale: 1 - 0.02 * pressed.value }],
  }));
  const distance = formatDistance(meetup.distanceKm);
  const footer = [exploreCopy.list.going(meetup.goingCount), distance].filter(Boolean).join(' · ');
  const when = formatWeekdayTime(meetup.startAt);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => pressed.set(withTiming(1, { duration: 90 }))}
      onPressOut={() => pressed.set(withTiming(0, { duration: 160 }))}
      accessibilityRole="button"
      accessibilityLabel={[meetup.title, meetup.placeName, when, footer].filter(Boolean).join(', ')}
    >
      <Animated.View
        style={[
          {
            width,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.card,
            overflow: 'hidden',
          },
          style,
        ]}
      >
        <View style={{ height: 112, backgroundColor: theme.skeleton }}>
          {meetup.imageUrl ? (
            <Image
              source={{ uri: meetup.imageUrl }}
              style={{ flex: 1 }}
              contentFit="cover"
              transition={200}
            />
          ) : null}
        </View>
        <View style={{ padding: 12, gap: 4 }}>
          <Text variant="labelMd" numberOfLines={2}>
            {meetup.title}
          </Text>
          {meetup.placeName ? (
            <Text variant="bodyXs" tone="muted" numberOfLines={1}>
              {meetup.placeName}
            </Text>
          ) : null}
          {when ? (
            <Text variant="bodyXs" tone="muted">
              {when}
            </Text>
          ) : null}
          <Text variant="bodyXs">{footer}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

export const MeetupCard = memo(MeetupCardComponent);
