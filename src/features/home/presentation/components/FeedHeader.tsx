import { Host } from '@expo/ui';
import { Pressable, View, useColorScheme } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { GlassSurface, NativeIcon, SkeletonBlock, Text, VectorIcon, icons } from '@shared/components';
import { useFontScale } from '@shared/hooks/useFontScale';
import { useTheme } from '@shared/hooks/useTheme';
import { palette } from '@shared/theme';

import type { CitySource, FeedCity } from '../../domain/entities/Feed';
import { homeCopy } from '../copy';
import { ProTag } from './ProTag';

/**
 * The top of the home feed: a coral pin, the city (Plus Jakarta 24) with a
 * chevron that opens Travel, the line under it, and the bell and chat buttons
 * — 44pt pale-Marigold circles on light, Deep on dark; Liquid Glass circles where
 * the phone has it (`GlassSurface`).
 *
 * The bell carries a small coral count while notifications are unread
 * (`unreadCount`, from the notifications feature via the route); it is said as
 * "Notifications, 3 unread".
 *
 * Until the feed has answered, the city and its line are skeleton bars, as the
 * skeleton frame draws them; the name fades in when it lands. The line says how
 * the server picked the city, and "Teleported to London" while a Travel
 * teleport is in force (spec §2.11).
 */

const BUTTON = 44;

export type FeedHeaderProps = {
  city: FeedCity | null;
  citySource: CitySource;
  /** Travel Pro: a PRO tag beside the city (Figma "Home Feed / Subscribed User"). */
  isPro?: boolean;
  onChooseCity: () => void;
  onNotifications: () => void;
  onMessages: () => void;
  /** Unread notifications; above zero, a badge on the bell. */
  unreadCount?: number;
};

/**
 * The bell's badge: a coral circle for one digit, a pill for more ("12", "99+").
 *
 * The size follows the text size (to the label's 1.2× cap), so the number never
 * outgrows it, and a single digit gets no side padding, which had stretched the
 * circle into an oval. No outline ring: on the glass it read as a cut edge.
 */
function UnreadBadge({ count }: { count: number }) {
  const scale = Math.min(useFontScale(), 1.2);
  const label = count > 99 ? '99+' : String(count);
  const size = Math.round(18 * scale);
  return (
    <View
      pointerEvents="none"
      style={{
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
      }}
    >
      <Text
        variant="labelXs"
        maxFontSizeMultiplier={1.2}
        style={{ color: palette.white, lineHeight: Math.round(13 * scale), textAlign: 'center' }}
      >
        {label}
      </Text>
    </View>
  );
}

export function FeedHeader({
  city,
  citySource,
  isPro = false,
  onChooseCity,
  onNotifications,
  onMessages,
  unreadCount = 0,
}: FeedHeaderProps) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  // Teal (light) / Mist (dark) once loaded; the skeleton's grey before.
  const iconTint = city ? (dark ? theme.foreground : palette.teal) : theme.track;

  return (
    <View className="flex-row items-center px-20 pt-8">
      <Pressable
        onPress={onChooseCity}
        disabled={!city}
        accessibilityRole="button"
        accessibilityLabel={city ? `${city.name}. ${homeCopy.chooseCity}` : undefined}
        style={{ flex: 1 }}
      >
        {city ? (
          <Animated.View entering={FadeIn.duration(220)}>
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <VectorIcon name="pin" size={20} color={palette.coral} />
              <Text variant="headingLg" numberOfLines={1} style={{ flexShrink: 1 }}>
                {city.name}
              </Text>
              {isPro ? <ProTag /> : null}
              <Host matchContents pointerEvents="none" ignoreSafeArea="all">
                <NativeIcon source={icons.chevronDown} size={13} color={theme.foreground} />
              </Host>
            </View>
            <Text variant="bodySm" tone="muted" className="mt-2">
              {citySource === 'teleport'
                ? homeCopy.teleportedTo(city.name)
                : homeCopy.citySubtitle[citySource]}
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
            [
              'bell',
              unreadCount > 0 ? `${homeCopy.notifications}, ${unreadCount} unread` : homeCopy.notifications,
              onNotifications,
            ],
            ['chat', homeCopy.messages, onMessages],
          ] as const
        ).map(([icon, label, onPress]) => (
          <Pressable key={icon} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
            {({ pressed }) => (
              <>
                <GlassSurface
                  fallbackColor={city ? theme.iconButtonFill : theme.skeletonSurface}
                  interactive
                  shadow={false}
                  onPlainPage
                  style={{
                    width: BUTTON,
                    height: BUTTON,
                    borderRadius: BUTTON / 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.6 : 1,
                  }}
                >
                  <VectorIcon name={icon} size={22} color={iconTint} />
                </GlassSurface>
                {icon === 'bell' && unreadCount > 0 ? <UnreadBadge count={unreadCount} /> : null}
              </>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}
