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

import { useSubscription } from '@features/payment';

import { POPULAR_TRAVEL_CITIES } from '../../domain/rules/travelRules';
import { ProTag } from '../components/ProTag';
import { TravelTag } from '../components/TravelTag';
import { travelCopy as copy } from '../copy';
import { useCitySearch } from '../hooks/useCitySearch';
import { travelStore, useTravel } from '../state/travelStore';

/**
 * Travel — "Explore activities in another city" (Figma "City picker / Free",
 * "City picker / Pro" and "City search / Results", light and dark).
 *
 * Free: the Travel Pro banner, then the Popular grid with the current city
 * first and chosen (mint, teal outline); every other city carries a PRO tag and
 * opens the paywall for it.
 *
 * Travel Pro (`useSubscription`): a PRO tag on the title and no banner; "Your
 * city" (tagged Home), "Recent" travels, and the Popular grid with TRAVEL
 * tags. Picking a city points the feed there (`travelStore`) and goes back;
 * picking your own city comes home. Nobody can be Pro until purchase exists —
 * the API cannot switch the feed's city yet (API map §12).
 *
 * Typing searches the catalogue (`GET /cities?q=`, cached — `useCitySearch`) and
 * lists the matches as rows, tagged the same way.
 */

type Pick = { id?: string; name: string; countryCode: string; countryName?: string };

export type TravelScreenProps = {
  /** The city the feed showed when this opened; used until the feed has recorded home. */
  current: { name: string; countryCode: string };
  onBack: () => void;
  /** Free members: the paywall for a city, or for "anywhere" (the Pro banner). */
  onPaywall: (city: { name: string; countryCode: string } | null) => void;
};

const GAP = 12;
/**
 * Three tiles a row, as drawn — two when the text is large or the screen narrow
 * (under 360pt of width per unit of text scale), so names never squeeze.
 */
const columnsFor = (width: number, fontScale: number) => (width / fontScale >= 360 ? 3 : 2);

const chunk = <T,>(items: readonly T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, i * size + size));

export function TravelScreen({ current, onBack, onPaywall }: TravelScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const search = useCitySearch();
  const { isPro } = useSubscription();
  const travel = useTravel();
  const columns = columnsFor(width, fontScale);
  const searching = search.active;
  const results = search.results;

  const home: Pick = travel.home ?? current;
  const here: Pick = travel.destination ?? home;
  const sameCity = (a: Pick, b: Pick) => a.name.toLowerCase() === b.name.toLowerCase();
  const isHere = (city: Pick) => sameCity(city, here);
  const isHome = (city: Pick) => sameCity(city, home);

  const choose = (city: Pick) => {
    if (isHere(city)) return onBack();
    if (!isPro) return onPaywall({ name: city.name, countryCode: city.countryCode });
    if (isHome(city)) travelStore.returnHome();
    else
      travelStore.travelTo({
        id: city.id ?? city.name,
        name: city.name,
        countryCode: city.countryCode,
        countryName: city.countryName,
      });
    onBack();
  };
  const badge = (city: Pick): Badge => (isHere(city) ? 'none' : isPro ? 'travel' : 'pro');
  const recent = travel.recent.filter((c) => !isHome(c));

  return (
    <Screen edges={['top']} padded={false}>
      <View className="flex-row items-center px-20 pt-8" style={{ gap: 12 }}>
        <Pressable onPress={onBack} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
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
            <Host matchContents pointerEvents="none" ignoreSafeArea="all">
              {/* It slides up over Home, so it closes rather than goes back. */}
              <NativeIcon source={icons.close} size={13} color={theme.foreground} />
            </Host>
          </View>
        </Pressable>
        <View style={{ flex: 1 }}>
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <Text variant="headingLg" accessibilityRole="header">
              {copy.title}
            </Text>
            {isPro ? <ProTag /> : null}
          </View>
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
          testID="travel-search"
        />
      </View>
      <View className="mt-16" style={{ height: 1, backgroundColor: theme.border }} />

      <ScrollView
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ padding: SCREEN_GUTTER, paddingBottom: Math.max(insets.bottom, 16) + 24 }}
      >
        {isPro ? null : (
          <Animated.View entering={enterRise(0)} className="mb-24">
            <Pressable
              onPress={() => onPaywall(null)}
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
        )}

        {searching ? (
          <View>
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
                    selected={isHere(city)}
                    home={isPro && isHome(city)}
                    badge={badge(city)}
                    onPress={() => choose(city)}
                  />
                </Animated.View>
              ))}
            </View>
          </View>
        ) : (
          <Animated.View entering={enterRise(80)}>
            {isPro ? (
              <>
                <Text variant="bodySm" tone="muted" className="mb-12">
                  {copy.yourCity}
                </Text>
                <CityRow
                  name={home.name}
                  country={home.countryName ?? ''}
                  countryCode={home.countryCode}
                  selected={isHere(home)}
                  home
                  badge="none"
                  onPress={() => choose(home)}
                />
                {recent.length > 0 ? (
                  <>
                    <Text variant="bodySm" tone="muted" className="mb-12 mt-24">
                      {copy.recent}
                    </Text>
                    <View style={{ gap: 12 }}>
                      {recent.map((city) => (
                        <CityRow
                          key={city.name}
                          name={city.name}
                          country={city.countryName ?? ''}
                          countryCode={city.countryCode}
                          selected={isHere(city)}
                          badge={badge(city)}
                          onPress={() => choose(city)}
                        />
                      ))}
                    </View>
                  </>
                ) : null}
              </>
            ) : null}
            <Text variant="bodySm" tone="muted" className={isPro ? 'mb-12 mt-24' : 'mb-12'}>
              {copy.popular}
            </Text>
            {/* Rows of equal flexible tiles, not widths worked out from the screen:
                three computed widths can add up to a hair over the row and push the
                last tile onto the next line. A short last row keeps its tiles' size. */}
            <View style={{ gap: GAP }}>
              {chunk(
                isPro
                  ? POPULAR_TRAVEL_CITIES.filter((c) => !isHome(c))
                  : [home, ...POPULAR_TRAVEL_CITIES.filter((c) => !isHome(c))],
                columns,
              ).map((row) => (
                <View key={row[0]?.name} style={{ flexDirection: 'row', gap: GAP }}>
                  {Array.from({ length: columns }, (_, i) => {
                    const city = row[i];
                    return (
                      <View key={city?.name ?? `empty-${i}`} style={{ flex: 1 }}>
                        {city ? (
                          <CityTile
                            square={fontScale <= 1.2}
                            name={city.name}
                            countryCode={city.countryCode}
                            selected={isHere(city)}
                            badge={badge(city)}
                            onPress={() => choose(city)}
                          />
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </Screen>
  );
}

type Badge = 'pro' | 'travel' | 'none';

function CityBadge({ badge }: { badge: Badge }) {
  return badge === 'pro' ? <ProTag /> : badge === 'travel' ? <TravelTag /> : null;
}

function CityTile({
  square,
  name,
  countryCode,
  selected,
  badge,
  onPress,
}: {
  /** Square, as drawn; off at large text sizes, where the tile grows to fit instead. */
  square: boolean;
  name: string;
  countryCode: string;
  selected: boolean;
  badge: Badge;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={selected ? `${name}, where you are` : badge === 'pro' ? `${name}, Pro` : name}
    >
      {({ pressed }) => (
        <View
          style={{
            aspectRatio: square ? 1 : undefined,
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
          <CityBadge badge={badge} />
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
  home = false,
  badge,
  onPress,
}: {
  name: string;
  country: string;
  countryCode: string;
  selected: boolean;
  /** Tags the person's own city "Home" (Pro). */
  home?: boolean;
  badge: Badge;
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
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <Text
                variant="bodyMd"
                style={[{ flexShrink: 1 }, selected ? { color: theme.selectedForeground } : null]}
              >
                {name}
              </Text>
              {home ? (
                <View
                  style={{
                    backgroundColor: palette.white,
                    borderRadius: 999,
                    paddingHorizontal: 8,
                    paddingVertical: 1,
                  }}
                >
                  <Text variant="bodyXs" style={{ color: palette.inkSecondary }}>
                    {copy.home}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text variant="bodySm" tone="muted" style={selected ? { color: palette.ink } : undefined}>
              {country || null}
            </Text>
          </View>
          {selected ? (
            <Host matchContents pointerEvents="none" ignoreSafeArea="all">
              <NativeIcon source={icons.check} size={16} color={theme.selectedForeground} />
            </Host>
          ) : (
            <CityBadge badge={badge} />
          )}
        </View>
      )}
    </Pressable>
  );
}
