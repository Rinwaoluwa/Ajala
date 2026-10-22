import { Image } from 'expo-image';
import { memo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@shared/hooks/useTheme';
import { palette } from '@shared/theme';

import { SvgIcon } from '../ui/SvgIcon';
import { VectorIcon } from '../ui/VectorIcon';
import { Text } from '../ui/Text';
import { formatCardDate, formatCardTime, formatDistance } from './formatPost';

/**
 * What a post card shows. Each feature maps its own post entity onto this, so
 * Home, Explore, the map, profiles and chat all draw the same card.
 */
export type PostCardModel = {
  id: string;
  type: 'meetup' | 'event' | 'plan' | 'group';
  title: string;
  /** The 800px card image, or null when the post has none. */
  imageUrl: string | null;
  /** ISO date-time; null only on a draft. */
  startAt: string | null;
  placeName: string | null;
  host: { name: string; avatarUrl: string | null };
  /** Null without the phone's location. */
  distanceKm: number | null;
};

const TYPE_LABEL: Record<PostCardModel['type'], string> = {
  meetup: 'Meetup',
  event: 'Event',
  plan: 'Plan',
  group: 'Group',
};

/**
 * A post on the feed (Figma Home Feed card): the cover photo full-bleed with a
 * dark fade at the foot; the type tag and a heart at the top; at the foot the
 * host, the distance, the title (Plus Jakarta 24, white), the date and time, and
 * the place.
 *
 * Not on the card: the design's description line. Feed cards carry no
 * description (`PostCardDto`); it belongs to the post page. Flagged.
 *
 * The heart is a STATIC PLACEHOLDER — there is no save endpoint (API map §12):
 * tapped, it fills coral (from a teal outline) and pops, but nothing is kept, as
 * agreed with product.
 *
 * Square, at the content width. Motion: a press dips the card to 98%; the photo
 * fades in over 250ms as it loads; the heart pops to 120% and settles.
 */

const RADIUS = 24;

function PostCardComponent({ post, onPress }: { post: PostCardModel; onPress: () => void }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [liked, setLiked] = useState(false);
  const press = useSharedValue(0);
  const heart = useSharedValue(1);

  const cardStyle = useAnimatedStyle(() => ({
    transform: reduceMotion ? [] : [{ scale: 1 - 0.02 * press.value }],
  }));
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: heart.value }] }));

  const toggleLike = () => {
    setLiked((v) => !v);
    if (!reduceMotion) {
      heart.set(
        withSequence(
          withTiming(1.2, { duration: 110, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 160, easing: Easing.inOut(Easing.quad) }),
        ),
      );
    }
  };

  const distance = formatDistance(post.distanceKm);
  const date = post.startAt ? formatCardDate(post.startAt) : null;
  const time = post.startAt ? formatCardTime(post.startAt) : null;

  return (
    <Animated.View style={cardStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => press.set(withTiming(1, { duration: 90 }))}
        onPressOut={() => press.set(withTiming(0, { duration: 160 }))}
        accessibilityRole="button"
        accessibilityLabel={[TYPE_LABEL[post.type], post.title, date, time, post.placeName, distance]
          .filter(Boolean)
          .join(', ')}
      >
        <View
          style={{
            aspectRatio: 1,
            borderRadius: RADIUS,
            overflow: 'hidden',
            backgroundColor: theme.skeleton,
          }}
        >
          {post.imageUrl ? (
            <Image
              source={{ uri: post.imageUrl }}
              style={{ position: 'absolute', width: '100%', height: '100%' }}
              contentFit="cover"
              transition={250}
              recyclingKey={post.id}
            />
          ) : null}
          {/* The dark fade the white text sits on. */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              inset: 0,
              experimental_backgroundImage:
                'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.55) 62%, rgba(0,0,0,0.85) 100%)',
            }}
          />

          <View className="flex-row items-start justify-between p-16">
            <View
              style={{
                backgroundColor: theme.accentSoft,
                borderRadius: 999,
                paddingHorizontal: 14,
                paddingVertical: 6,
              }}
            >
              <Text variant="bodyMd" style={{ color: palette.ink }}>
                {TYPE_LABEL[post.type]}
              </Text>
            </View>
            <Pressable
              onPress={toggleLike}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={liked ? 'Saved' : 'Save'}
              accessibilityState={{ selected: liked }}
            >
              <Animated.View
                style={[
                  {
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: palette.white,
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                  heartStyle,
                ]}
              >
                <VectorIcon
                  name="like"
                  size={26}
                  color={liked ? palette.coral : palette.teal}
                  filled={liked}
                />
              </Animated.View>
            </Pressable>
          </View>

          <View style={{ position: 'absolute', left: 16, right: 16, bottom: 16, gap: 6 }}>
            <View className="flex-row items-center" style={{ gap: 8 }}>
              {post.host.avatarUrl ? (
                <Image
                  source={{ uri: post.host.avatarUrl }}
                  style={{ width: 22, height: 22, borderRadius: 11 }}
                />
              ) : null}
              <Text
                variant="bodySm"
                numberOfLines={1}
                style={{ color: 'rgba(255,255,255,0.85)', flexShrink: 1 }}
              >
                {post.host.name}
              </Text>
              {distance ? (
                <View
                  style={{
                    backgroundColor: palette.white,
                    borderRadius: 999,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                  }}
                >
                  <Text variant="bodyXs" style={{ color: palette.ink }}>
                    {distance}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text variant="headingLg" numberOfLines={2} style={{ color: palette.white }}>
              {post.title}
            </Text>
            {date ? (
              <View className="flex-row items-center" style={{ gap: 14 }}>
                <Meta icon="calendar" text={date} />
                {time ? <Meta icon="clock" text={time} /> : null}
              </View>
            ) : null}
            {post.placeName ? <Meta icon="pin" text={post.placeName} /> : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function Meta({ icon, text }: { icon: 'calendar' | 'clock' | 'pin'; text: string }) {
  return (
    <View className="flex-row items-center" style={{ gap: 6, flexShrink: 1 }}>
      {icon === 'pin' ? (
        <VectorIcon name="pin" size={13} color={palette.white} />
      ) : (
        <SvgIcon name={icon} size={13} tint={palette.white} />
      )}
      <Text variant="bodySm" numberOfLines={1} style={{ color: palette.white, flexShrink: 1 }}>
        {text}
      </Text>
    </View>
  );
}

/** Memoised: a feed of cards re-renders only the one that changed. */
export const PostCard = memo(PostCardComponent);
