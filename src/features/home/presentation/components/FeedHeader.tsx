import { Host } from '@expo/ui';
import { Pressable, View, useColorScheme } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { NativeIcon, SkeletonBlock, Text, VectorIcon, icons } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { palette } from '@shared/theme';

import type { CitySource, FeedCity } from '../../domain/entities/Feed';
import { homeCopy } from '../copy';

/**
 * The top of the home feed: a coral pin, the city (Plus Jakarta 24) with a
 * chevron that opens Teleport, the line under it, and the bell and chat buttons
 * — 44pt pale-Marigold circles on light, Deep on dark.
 *
 * Until the feed has answered, the city and its line are skeleton bars, as the
 * skeleton frame draws them; the name fades in when it lands. The bell and chat
 * have no unread dots: there is no notifications or chat API yet.
 */

const BUTTON = 44;

export type FeedHeaderProps = {
  city: FeedCity | null;
  citySource: CitySource;
  onChooseCity: () => void;
  onNotifications: () => void;
  onMessages: () => void;
};

export function FeedHeader({ city, citySource, onChooseCity, onNotifications, onMessages }: FeedHeaderProps) {
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
              <Host matchContents pointerEvents="none">
                <NativeIcon source={icons.chevronDown} size={13} color={theme.foreground} />
              </Host>
            </View>
            <Text variant="bodySm" tone="muted" className="mt-2">
              {homeCopy.citySubtitle[citySource]}
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
            ['bell', homeCopy.notifications, onNotifications],
            ['chat', homeCopy.messages, onMessages],
          ] as const
        ).map(([icon, label, onPress]) => (
          <Pressable key={icon} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
            {({ pressed }) => (
              <View
                style={{
                  width: BUTTON,
                  height: BUTTON,
                  borderRadius: BUTTON / 2,
                  backgroundColor: city ? theme.iconButtonFill : theme.skeletonSurface,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.6 : 1,
                }}
              >
                <VectorIcon name={icon} size={22} color={iconTint} />
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}
