import { useEffect, useRef, useState } from 'react';
import { Pressable, View, useColorScheme } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Host, GlassSurface, JellyPress, NativeIcon, SkeletonBlock, Text, VectorIcon, icons } from '@shared/components';
import { useFontScale } from '@shared/hooks/useFontScale';
import { useTheme } from '@shared/hooks/useTheme';
import { palette } from '@shared/theme';

import { homeCopy } from '../copy';
import type { FeedPlace } from '../hooks/useFeed';
import { ProTag } from './ProTag';

/**
 * The top of the home feed: a coral pin, where the feed looks (Plus Jakarta 24)
 * with a chevron that opens Travel, the line under it, and the bell and chat buttons
 * — 44pt pale-Marigold circles on light, Deep on dark; Liquid Glass circles where
 * the phone has it (`GlassSurface`).
 *
 * The bell carries a small coral count while notifications are unread
 * (`unreadCount`, from the notifications feature via the route), and the chat
 * button the same badge while conversations are unread (`unreadChatsCount`,
 * from the chat feature); they are said as "Notifications, 3 unread" and
 * "Messages, 2 unread".
 *
 * Until the feed has answered, the place and its line are skeleton bars, as the
 * skeleton frame draws them; the name fades in when it lands. The feed has no
 * city any more, only the point it looks around (`origin`): the big line is the
 * teleport's name, or the region the phone is in ("Lagos", else "Near you"),
 * and the line under it says "Teleported to Accra, Ghana" while a Travel
 * teleport is in force (spec §2.11). With no location and no teleport (404
 * NO_LOCATION, `noLocation`) it reads "Choose a place" and still opens Travel.
 */

const BUTTON = 44;

export type FeedHeaderProps = {
  /** Null until the feed (or `GET /me`'s teleport) says where it looks. */
  place: FeedPlace | null;
  /** The feed answered NO_LOCATION: no location and no teleport. */
  noLocation?: boolean;
  /** Travel Pro: a PRO tag beside the city (Figma "Home Feed / Subscribed User"). */
  isPro?: boolean;
  onChooseCity: () => void;
  onNotifications: () => void;
  onMessages: () => void;
  /** Unread notifications; above zero, a badge on the bell. */
  unreadCount?: number;
  /** Conversations with anything unread; above zero, the same badge on the chat button. */
  unreadChatsCount?: number;
};

/**
 * The bell's and the chat button's badge: a coral circle for one digit, a pill for more ("12", "99+").
 *
 * The size follows the text size (to the label's 1.2× cap), so the number never
 * outgrows it, and a single digit gets no side padding, which had stretched the
 * circle into an oval. No outline ring: on the glass it read as a cut edge.
 *
 * Motion (product, 12 Nov; Material 3 badges, Apple's HIG and NN/g on motion:
 * animate the change, briefly, never on a loop):
 *   - something unread arrives: the badge pops in, from small past full size
 *     and back (a spring), as it fades in;
 *   - the count goes up: one quick bump, so a new message is noticed;
 *   - all read: it shrinks a little and fades out, keeping its last number
 *     until it is gone.
 * Nothing pulses or repeats. No haptic: a message arriving is not something the
 * person did. With Reduce Motion the badge only fades.
 */
const POP_SPRING = { damping: 9, stiffness: 260, mass: 0.6 } as const;
const SETTLE_SPRING = { damping: 10, stiffness: 300, mass: 0.5 } as const;

function UnreadBadge({ count }: { count: number }) {
  const scale = Math.min(useFontScale(), 1.2);
  const reduceMotion = useReducedMotion();
  // The number shown: the last one above zero, so the badge keeps it while it fades away.
  const [shownCount, setShownCount] = useState(count);
  if (count > 0 && count !== shownCount) setShownCount(count);
  const grow = useSharedValue(count > 0 ? 1 : 0);
  const fade = useSharedValue(count > 0 ? 1 : 0);
  const before = useRef(count);

  useEffect(() => {
    const was = before.current;
    before.current = count;
    if (count > 0 && was <= 0) {
      // Arrived: pop in.
      fade.set(withTiming(1, { duration: 140 }));
      grow.set(reduceMotion ? 1 : withSequence(withTiming(0.3, { duration: 0 }), withSpring(1, POP_SPRING)));
    } else if (count <= 0 && was > 0) {
      // All read: shrink a little and fade out.
      fade.set(withTiming(0, { duration: 180 }));
      if (!reduceMotion) grow.set(withTiming(0.5, { duration: 180, easing: Easing.in(Easing.quad) }));
    } else if (count > was && !reduceMotion) {
      // One more: a single bump.
      grow.set(withSequence(withTiming(1.25, { duration: 110, easing: Easing.out(Easing.quad) }), withSpring(1, SETTLE_SPRING)));
    }
  }, [count, reduceMotion, grow, fade]);

  const motion = useAnimatedStyle(() => ({ opacity: fade.value, transform: [{ scale: grow.value }] }));

  if (shownCount <= 0) return null;
  const label = shownCount > 99 ? '99+' : String(shownCount);
  const size = Math.round(18 * scale);
  return (
    <Animated.View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[
        {
          position: 'absolute',
          top: -3,
          right: -3,
          height: size,
          minWidth: size,
          paddingHorizontal: label.length > 1 ? Math.round(5 * scale) : 0,
          borderRadius: size / 2,
          backgroundColor: palette.coral,
          alignItems: 'center',
          justifyContent: 'center',
        },
        motion,
      ]}
    >
      <Text
        variant="labelXs"
        maxFontSizeMultiplier={1.2}
        style={{ color: palette.white, lineHeight: Math.round(13 * scale), textAlign: 'center' }}
      >
        {label}
      </Text>
    </Animated.View>
  );
}

export function FeedHeader({
  place,
  noLocation = false,
  isPro = false,
  onChooseCity,
  onNotifications,
  onMessages,
  unreadCount = 0,
  unreadChatsCount = 0,
}: FeedHeaderProps) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const shown = place !== null || noLocation;
  // Teal (light) / Mist (dark) once loaded; the skeleton's grey before.
  const iconTint = shown ? (dark ? theme.foreground : palette.teal) : theme.track;
  const title = place
    ? (place.name ?? (place.teleported ? homeCopy.teleported : homeCopy.nearYou))
    : homeCopy.choosePlace;
  const subtitle = place
    ? place.teleported
      ? place.label
        ? homeCopy.teleportedTo(place.label)
        : homeCopy.teleported
      : homeCopy.deviceSubtitle
    : homeCopy.locationOff;

  return (
    // 8pt under the row: the pinned pills below have an opaque background, which cut off
    // the bottom of the bell's and chat's shadows when it started right under them.
    <View className="flex-row items-center px-20 pt-8" style={{ paddingBottom: 8 }}>
      <Pressable
        onPress={onChooseCity}
        disabled={!shown}
        accessibilityRole="button"
        accessibilityLabel={shown ? `${title}. ${subtitle}. ${homeCopy.chooseCity}` : undefined}
        style={{ flex: 1 }}
      >
        {shown ? (
          <Animated.View entering={FadeIn.duration(220)}>
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <VectorIcon name="pin" size={20} color={palette.coral} />
              <Text variant="headingLg" numberOfLines={1} style={{ flexShrink: 1 }}>
                {title}
              </Text>
              {isPro ? <ProTag /> : null}
              <Host matchContents pointerEvents="none" ignoreSafeArea="all">
                <NativeIcon source={icons.chevronDown} size={13} color={theme.foreground} />
              </Host>
            </View>
            <Text variant="bodySm" tone="muted" className="mt-2" numberOfLines={2}>
              {subtitle}
            </Text>
          </Animated.View>
        ) : (
          <View>
            <View className="flex-row items-center" style={{ gap: 10 }}>
              <VectorIcon name="pin" size={22} color={theme.skeleton} />
              <SkeletonBlock width={96} height={22} radius={6} />
            </View>
            <View className="mt-8">
              <SkeletonBlock width={180} height={16} radius={6} />
            </View>
          </View>
        )}
      </Pressable>
      <View className="flex-row" style={{ gap: 10 }}>
        {(
          [
            ['bell', homeCopy.notifications, unreadCount, onNotifications],
            ['chat', homeCopy.messages, unreadChatsCount, onMessages],
          ] as const
        ).map(([icon, name, count, onPress]) => (
          // A jelly wobble on touch, on both platforms (`JellyPress`).
          <JellyPress
            key={icon}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={count > 0 ? `${name}, ${count} unread` : name}
          >
            <GlassSurface
              fallbackColor={shown ? theme.iconButtonFill : theme.skeletonSurface}
              interactive
              shadow={false}
              onPlainPage
              style={{
                width: BUTTON,
                height: BUTTON,
                borderRadius: BUTTON / 2,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <VectorIcon name={icon} size={22} color={iconTint} />
            </GlassSurface>
            {/* Always there: it animates itself in and out (`UnreadBadge`). */}
            <UnreadBadge count={count} />
          </JellyPress>
        ))}
      </View>
    </View>
  );
}
