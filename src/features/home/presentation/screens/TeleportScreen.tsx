import { Host } from '@expo/ui';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  NativeIcon,
  NativeSpinner,
  Screen,
  SwirlPattern,
  Text,
  TextField,
  enterRise,
  icons,
} from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER, palette } from '@shared/theme';
import { flagEmoji } from '@shared/utils/flagEmoji';

import { POPULAR_TELEPORT_CITIES } from '../../domain/rules/teleportRules';
import { ProTag } from '../components/ProTag';
import { teleportCopy as copy } from '../copy';
import { useCitySearch } from '../hooks/useCitySearch';

/**
 * Teleport — "Explore activities in another city" (Figma "City picker / Free"
 * and "City search / Results", light and dark).
 *
 * The Teleport Pro banner, then the Popular grid with the current city first and
 * chosen (mint, teal outline); every other city carries a PRO tag. Typing
 * searches the catalogue (`GET /cities?q=`, cached — `useCitySearch`) and lists
 * the matches the same way.
 *
 * The feed cannot be pointed at another city yet and the subscription is not
 * built (API map §12), so any other city opens the paywall for it — which says
 * it is coming soon. Picking the current city simply goes back.
 */

export type TeleportScreenProps = {
  current: { name: string; countryCode: string };
  onBack: () => void;
  onChooseCity: (city: { name: string; countryCode: string }) => void;
  onPro: () => void;
};

const COLUMNS = 3;
const GAP = 12;

export function TeleportScreen({ current, onBack, onChooseCity, onPro }: TeleportScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const search = useCitySearch();
  const tile = (width - SCREEN_GUTTER * 2 - GAP * (COLUMNS - 1)) / COLUMNS;
  const searching = search.active;
  const results = search.results;
  const isCurrent = (name: string) => name.toLowerCase() === current.name.toLowerCase();
  const choose = (city: { name: string; countryCode: string }) =>
    isCurrent(city.name) ? onBack() : onChooseCity(city);

  return (
    <Screen edges={['top']} padded={false}>
      <View className="flex-row items-center px-20 pt-8" style={{ gap: 12 }}>
        <Pressable onPress={onBack} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back">
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: theme.iconButtonFill,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Host matchContents pointerEvents="none">
              <NativeIcon source={icons.chevronLeft} size={14} color={theme.foreground} />
            </Host>
          </View>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="headingLg" accessibilityRole="header">
            {copy.title}
          </Text>
          <Text variant="bodySm" tone="muted">
            {copy.subtitle}
          </Text>
        </View>
      </View>

      <View className="mt-16 px-20">
        <TextField
          label={copy.search}
          labelHidden
          placeholder={copy.search}
          filled
          autoCorrect={false}
          returnKeyType="search"
          leading={<NativeIcon source={icons.search} size={16} color={palette.inkSecondary} />}
          trailing={
            searching && !results ? <NativeSpinner size={14} color={palette.inkSecondary} /> : undefined
          }
          onChangeText={search.setQuery}
          testID="teleport-search"
        />
      </View>
      <View className="mt-16" style={{ height: 1, backgroundColor: theme.border }} />

      <ScrollView
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ padding: SCREEN_GUTTER, paddingBottom: Math.max(insets.bottom, 16) + 24 }}
      >
        <Animated.View entering={enterRise(0)}>
          <Pressable
            onPress={onPro}
            accessibilityRole="button"
            accessibilityLabel={`${copy.proTitle}. ${copy.proBody}`}
          >
            <View
              style={{
                borderRadius: 20,
                overflow: 'hidden',
                backgroundColor: palette.tealDark,
                paddingHorizontal: 20,
                paddingVertical: 18,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <SwirlPattern color={palette.teal} opacity={0.35} />
              <View style={{ flex: 1 }}>
                <Text variant="headingSm" style={{ color: palette.white }}>
                  {copy.proTitle}
                </Text>
                <Text variant="bodySm" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {copy.proBody}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                }}
              >
                <Text variant="labelSm" style={{ color: palette.white }}>
                  {copy.pro}
                </Text>
              </View>
            </View>
          </Pressable>
        </Animated.View>

        {searching ? (
          <View className="mt-24">
            <Text variant="bodySm" tone="muted" className="mb-12">
              {copy.results}
            </Text>
            {results && results.length === 0 ? (
              <Text variant="bodySm" tone="muted">
                {copy.noResults}
              </Text>
            ) : null}
            <View style={{ gap: 12 }}>
              {(results ?? []).map((city) => (
                <Animated.View key={city.id} entering={FadeIn.duration(180)}>
                  <CityRow
                    name={city.name}
                    country={city.countryName}
                    countryCode={city.countryCode}
                    selected={isCurrent(city.name)}
                    onPress={() => choose(city)}
                  />
                </Animated.View>
              ))}
            </View>
          </View>
        ) : (
          <Animated.View entering={enterRise(80)} className="mt-24">
            <Text variant="bodySm" tone="muted" className="mb-12">
              {copy.popular}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
              {[current, ...POPULAR_TELEPORT_CITIES.filter((c) => !isCurrent(c.name))].map((city) => (
                <CityTile
                  key={city.name}
                  size={tile}
                  name={city.name}
                  countryCode={city.countryCode}
                  selected={isCurrent(city.name)}
                  onPress={() => choose(city)}
                />
              ))}
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </Screen>
  );
}

function CityTile({
  size,
  name,
  countryCode,
  selected,
  onPress,
}: {
  size: number;
  name: string;
  countryCode: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={selected ? `${name}, your city` : `${name}, Pro`}
    >
      {({ pressed }) => (
        <View
          style={{
            width: size,
            minHeight: size,
            borderRadius: 16,
            borderWidth: selected ? 2 : 1,
            borderColor: selected ? theme.selectedForeground : theme.border,
            backgroundColor: selected ? theme.selectedFill : theme.card,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 12,
            gap: 6,
            opacity: pressed ? 0.7 : 1,
          }}
        >
          <Text style={{ fontSize: 34, lineHeight: 40 }} allowFontScaling={false}>
            {flagEmoji(countryCode)}
          </Text>
          <Text
            variant="bodySm"
            numberOfLines={1}
            style={selected ? { color: theme.selectedForeground } : undefined}
          >
            {name}
          </Text>
          {selected ? null : <ProTag />}
        </View>
      )}
    </Pressable>
  );
}

function CityRow({
  name,
  country,
  countryCode,
  selected,
  onPress,
}: {
  name: string;
  country: string;
  countryCode: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }}>
      {({ pressed }) => (
        <View
          style={{
            minHeight: 72,
            borderRadius: 16,
            borderWidth: selected ? 2 : 1,
            borderColor: selected ? theme.selectedForeground : theme.border,
            backgroundColor: selected ? theme.selectedFill : theme.card,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            gap: 14,
            opacity: pressed ? 0.7 : 1,
          }}
        >
          <Text style={{ fontSize: 30, lineHeight: 36 }} allowFontScaling={false}>
            {flagEmoji(countryCode)}
          </Text>
          <View style={{ flex: 1 }}>
            <Text variant="bodyMd" style={selected ? { color: theme.selectedForeground } : undefined}>
              {name}
            </Text>
            <Text variant="bodySm" tone="muted" style={selected ? { color: palette.ink } : undefined}>
              {country}
            </Text>
          </View>
          {selected ? (
            <Host matchContents pointerEvents="none">
              <NativeIcon source={icons.check} size={16} color={theme.selectedForeground} />
            </Host>
          ) : (
            <ProTag />
          )}
        </View>
      )}
    </Pressable>
  );
}
