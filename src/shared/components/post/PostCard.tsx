import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { memo, useEffect } from 'react';
import { Alert, Pressable, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useLiquidGlass } from '@shared/hooks/useLiquidGlass';
import { useMeasuredWidth } from '@shared/hooks/useMeasuredWidth';
import { useRsvpPost } from '@shared/hooks/useRsvpPost';
import { useSavePost } from '@shared/hooks/useSavePost';
import { useTheme } from '@shared/hooks/useTheme';
import { palette } from '@shared/theme';
import type { RsvpState } from '@shared/state/postRsvps';

import { GlassSurface } from '../surface/GlassSurface';
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
  host: { id?: string; name: string; avatarUrl: string | null };
  /** Null without the phone's location. */
  distanceKm: number | null;
  /**
   * The server's `saved` for this person (spec §6 `PostCardDto.saved`). Optional
   * while every feature maps it; missing reads as not saved.
   */
  saved?: boolean;
  /** A line about the post, under the title, when the server sends one. */
  description?: string | null;
  /** Where the person stands on it; with it, the card offers the quick RSVP. */
  rsvpState?: RsvpState;
  /** The person's own post: no RSVP (the server refuses one from the host). */
  mine?: boolean;
  /** A private post asks the host first: the quick RSVP says "Requested". */
  visibility?: 'open' | 'private';
};

const TYPE_LABEL: Record<PostCardModel['type'], string> = {
  meetup: 'Meetup',
  event: 'Event',
  plan: 'Plan',
  group: 'Group',
};

const cardCopy = {
  viewDetails: 'View details',
  rsvp: 'RSVP',
  going: 'Going',
  requested: 'Requested',
  waitlisted: 'On the waitlist',
  leaveTitle: 'Leave this one?',
  leaveBody: 'You can RSVP again later if there is still room.',
  stay: 'Stay',
  leave: 'Leave',
  openHost: (name: string) => `Open ${name}’s profile`,
} as const;

/**
 * A post on the feed (Figma Home Feed card): the cover photo full-bleed with a
 * dark fade at the foot; the type tag and, at the top-right, a save (bookmark)
 * button with the quick RSVP under it; at the foot the host, the distance, the
 * title (Plus Jakarta 24, white), a line about it, the date and time, the
 * place, and a "View details →" pill.
 *
 * The host's photo and name open their profile (`onOpenHost`). "View details"
 * opens the post the plain way (`onViewDetails`, else `onPress`), so it works
 * inside a link that owns the card's own press.
 *
 * Liquid Glass where the phone has it (`GlassSurface`): the distance pill and
 * the round buttons sit on the photo as light glass with no fill of their own.
 * Elsewhere they are the design's solid white. The type tag stays solid
 * Marigold in both, as designed.
 *
 * The bookmark saves the post to the account (`useSavePost`: `POST`/`DELETE
 * /posts/{id}/save`). Tapped, it fills at once (Ionicons `bookmark-outline` →
 * `bookmark`, cross-faded) and pops, and goes back if the server refuses;
 * "Saved activities" lists what was kept.
 *
 * The RSVP joins the post at once (`useRsvpPost`: `POST /posts/{id}/rsvp`),
 * after `onBeforeRsvp` has had its say (Home shows "Before you RSVP" the first
 * time). Joined, the mark is a filled tick and says Going, Requested or On the
 * waitlist; tapping it again asks before leaving. Posts the host declined the
 * person from, or removed them from, offer no RSVP.
 *
 * Square at least, at the content width. Motion: a press dips the card to 98%;
 * the photo fades in over 250ms as it loads; a tapped mark pops to 120% and settles.
 */

const RADIUS = 24;
const BUTTON = 48;

export type PostCardProps = {
  post: PostCardModel;
  onPress: () => void;
  /** "View details"; `onPress` when left out. */
  onViewDetails?: () => void;
  /** The host's photo or name was tapped. Without it, they are not buttons. */
  onOpenHost?: (hostId: string) => void;
  /**
   * Asked before the first quick RSVP; resolve true to go ahead. Without it the
   * RSVP goes straight through.
   */
  onBeforeRsvp?: () => Promise<boolean>;
};

/**
 * Glass over a photo takes on the photo: over a dark one it turned dark, and
 * the ink and teal marks on it stopped reading. A white tint keeps every glass
 * pill and button on the card pale, as the solid fallback is.
 */
const PALE_GLASS = 'rgba(255,255,255,0.72)';

function PostCardComponent({ post, onPress, onViewDetails, onOpenHost, onBeforeRsvp }: PostCardProps) {
  const theme = useTheme();
  const glass = useLiquidGlass();
  const paleTint = glass ? PALE_GLASS : null;
  const reduceMotion = useReducedMotion();
  const { saved, toggle } = useSavePost(post.id, post.saved);
  const rsvp = useRsvpPost(post.id, post.rsvpState ?? 'none');
  const press = useSharedValue(0);

  const cardStyle = useAnimatedStyle(() => ({
    transform: reduceMotion ? [] : [{ scale: 1 - 0.02 * press.value }],
  }));

  const quickRsvp = () => {
    if (rsvp.pending) return;
    if (rsvp.joined) {
      Alert.alert(cardCopy.leaveTitle, cardCopy.leaveBody, [
        { text: cardCopy.stay, style: 'cancel' },
        { text: cardCopy.leave, style: 'destructive', onPress: rsvp.leave },
      ]);
      return;
    }
    const go = () => rsvp.join();
    if (onBeforeRsvp) void onBeforeRsvp().then((ok) => ok && go());
    else go();
  };

  // Square at least: the top row and the foot sit in normal flow at either end, so at a
  // large text size the foot makes the card taller instead of running into the tag
  // and bookmark. Until the first layout it is a plain square, as it always looks at 1x.
  const { width: cardWidth, onLayout: onCardLayout } = useMeasuredWidth();
  const distance = formatDistance(post.distanceKm);
  const date = post.startAt ? formatCardDate(post.startAt) : null;
  const time = post.startAt ? formatCardTime(post.startAt) : null;
  const offersRsvp = post.rsvpState !== undefined && !rsvp.closed && !post.mine;
  const rsvpLabel = !rsvp.joined
    ? cardCopy.rsvp
    : rsvp.state === 'requested'
      ? cardCopy.requested
      : rsvp.state === 'waitlisted'
        ? cardCopy.waitlisted
        : cardCopy.going;
  const hostTap = onOpenHost && post.host.id ? () => onOpenHost(post.host.id!) : undefined;

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
          onLayout={onCardLayout}
          style={{
            ...(cardWidth > 0 ? { minHeight: cardWidth } : { aspectRatio: 1 }),
            justifyContent: 'space-between',
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
            <View style={{ gap: 10, alignItems: 'center' }}>
              <MarkButton
                on={saved}
                onPress={toggle}
                outline="bookmark-outline"
                filled="bookmark"
                label={saved ? 'Saved' : 'Save'}
              />
              {offersRsvp ? (
                <MarkButton
                  on={rsvp.joined}
                  onPress={quickRsvp}
                  outline="person-add-outline"
                  filled="checkmark-circle"
                  label={rsvpLabel}
                  busy={rsvp.pending}
                />
              ) : null}
            </View>
          </View>

          <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 6 }}>
            {/* Plain styles here and on "View details": a style function on a Pressable is
                dropped by the class-name interop, which left the rows stretched full width. */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={hostTap}
              disabled={!hostTap}
              hitSlop={6}
              accessibilityRole={hostTap ? 'button' : undefined}
              accessibilityLabel={hostTap ? cardCopy.openHost(post.host.name) : undefined}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' }}
            >
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
                <GlassSurface
                  fallbackColor={palette.white}
                  appearance="light"
                  tint={paleTint}
                  shadow={false}
                  style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}
                >
                  <Text variant="bodyXs" style={{ color: palette.ink }}>
                    {distance}
                  </Text>
                </GlassSurface>
              ) : null}
            </TouchableOpacity>
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
            {post.description ? (
              <Text variant="bodySm" numberOfLines={2} style={{ color: 'rgba(255,255,255,0.85)' }}>
                {post.description}
              </Text>
            ) : null}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onViewDetails ?? onPress}
              accessibilityRole="button"
              accessibilityLabel={cardCopy.viewDetails}
              style={{ alignSelf: 'flex-start', marginTop: 6 }}
            >
              <GlassSurface
                fallbackColor={palette.white}
                appearance="light"
                tint={paleTint}
                interactive
                shadow={false}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  borderRadius: 999,
                  paddingHorizontal: 18,
                  minHeight: 40,
                }}
              >
                <Text variant="labelMd" style={{ color: palette.teal }}>
                  {cardCopy.viewDetails}
                </Text>
                <Ionicons name="arrow-forward" size={16} color={palette.teal} />
              </GlassSurface>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/**
 * A round glass button whose mark fills: outline and filled versions
 * cross-fade in 160ms, so the mark keeps its shape and only fills, and a tap
 * pops it to 120% and back. The glass under it never moves.
 */
function MarkButton({
  on,
  onPress,
  outline,
  filled,
  label,
  busy = false,
}: {
  on: boolean;
  onPress: () => void;
  outline: keyof typeof Ionicons.glyphMap;
  filled: keyof typeof Ionicons.glyphMap;
  label: string;
  busy?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const glass = useLiquidGlass();
  const fill = useSharedValue(on ? 1 : 0);
  const pop = useSharedValue(1);

  useEffect(() => {
    fill.set(withTiming(on ? 1 : 0, { duration: 160, easing: Easing.out(Easing.quad) }));
  }, [on, fill]);

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const outlineStyle = useAnimatedStyle(() => ({ opacity: 1 - fill.value }));
  const filledStyle = useAnimatedStyle(() => ({ opacity: fill.value }));

  const tap = () => {
    onPress();
    if (!reduceMotion) {
      pop.set(
        withSequence(
          withTiming(1.2, { duration: 110, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 160, easing: Easing.inOut(Easing.quad) }),
        ),
      );
    }
  };

  return (
    <Pressable
      onPress={tap}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on, busy }}
    >
      <Animated.View style={popStyle}>
        <GlassSurface
          fallbackColor={palette.white}
          appearance="light"
          tint={glass ? PALE_GLASS : null}
          interactive
          shadow={false}
          style={{
            width: BUTTON,
            height: BUTTON,
            borderRadius: BUTTON / 2,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: busy ? 0.7 : 1,
          }}
        >
          <Animated.View style={[{ position: 'absolute' }, outlineStyle]}>
            <Ionicons name={outline} size={24} color={palette.teal} />
          </Animated.View>
          <Animated.View style={filledStyle}>
            <Ionicons name={filled} size={24} color={palette.teal} />
          </Animated.View>
        </GlassSurface>
      </Animated.View>
    </Pressable>
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
