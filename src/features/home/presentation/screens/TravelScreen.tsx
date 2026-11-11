import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Host,
  Button,
  NativeIcon,
  NativeSpinner,
  Screen,
  SvgIcon,
  SwirlPattern,
  Text,
  TextField,
  enterRise,
  icons,
} from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER, palette } from '@shared/theme';

import { useSubscription } from '@features/payment';

import type { TravelCity } from '../../domain/entities/Feed';
import { isFeedError } from '../../domain/entities/FeedError';
import { shortPlaceName, travelChoice, type TravelPick } from '../../domain/rules/travelRules';
import { ProTag } from '../components/ProTag';
import { TravelTag } from '../components/TravelTag';
import { travelCopy as copy } from '../copy';
import { useCitySearch } from '../hooks/useCitySearch';
import { usePlaceName } from '../hooks/usePlaceName';
import { useTravelMove, type TravelMove } from '../hooks/useTravelMove';
import { useTravelState } from '../hooks/useTravelState';
import { useTravelMemory } from '../state/travelMemory';

/**
 * Travel — "Explore activities in another city" (Figma "City picker / Free",
 * "City picker / Pro" and "City search / Results", light and dark).
 *
 * The API has no cities any more, only Google place ids, and no popular-cities
 * list (Swagger, 9 Nov). So the design's Popular grid is gone: Travel offers
 * "Where you are" (the phone's location, where coming home lands), the last
 * few teleports ("Recent", remembered for this run) and a city search on the
 * phone (`@core/places`, cities only).
 *
 * Free: the Travel Pro banner; every city carries a PRO tag and opens the
 * paywall for it.
 *
 * Travel (`useSubscription`): a PRO tag on the title and no banner; cities
 * carry TRAVEL tags. Picking a city teleports there (`POST /me/teleport
 * { placeId }`); picking "Where you are" while teleported comes home (`DELETE
 * /me/teleport`). Either way Travel closes once the server has said yes, and
 * the feed, map and search reload around the new place. A 402 (the
 * subscription lapsed) opens the paywall instead.
 *
 * Whether the feed is teleported, and where, is the server's word (`GET /me`,
 * `useTravelState`); the route's `current` and `teleported` only stand in until
 * it has answered. `GET /me` names the teleport by place id alone, so its name
 * is the feed's (`current.label`) or a cached place lookup.
 *
 * Suggestions carry no country code, so rows show the globe rather than a flag.
 */

export type TravelScreenProps = {
  /** What the feed's header showed when this opened: the teleport's name, if any. */
  current: { label: string | null };
  /** Whether the feed was on a teleport (`originSource: 'teleport'`), until `GET /me` says. */
  teleported: boolean;
  onBack: () => void;
  /**
   * Not subscribed: the paywall for a city, or for "anywhere" (the Pro banner).
   * `homeCountryCode` is the account's home place's country, for the paywall's
   * home flag; null when unknown.
   */
  onPaywall: (city: { name: string } | null, homeCountryCode: string | null) => void;
};

export function TravelScreen({ current, teleported, onBack, onPaywall }: TravelScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const search = useCitySearch();
  const { isPro } = useSubscription();
  const memory = useTravelMemory();
  const state = useTravelState();
  const travel = useTravelMove();
  const searching = search.active;
  const results = search.results;

  // The server's word wins: the feed's page (and so `current`) can be a little older.
  const isTeleported = state ? state.teleport !== null : teleported;
  const teleportId = state?.teleport?.placeId ?? null;
  const here = { teleported: isTeleported, placeId: teleportId };
  // Named by the feed when it can; looked up (once, cached) when only `GET /me` knows the id.
  const lookedUp = usePlaceName(isTeleported && !current.label ? teleportId : null);
  const teleportLabel = current.label ?? lookedUp;
  const homeCountry = state?.homePlace?.countryCode ?? null;

  // The current teleport heads "Recent", even when it was made before this run.
  const recent: TravelCity[] =
    isTeleported && teleportId && !memory.recent.some((c) => c.placeId === teleportId)
      ? [
          {
            placeId: teleportId,
            name: teleportLabel ? shortPlaceName(teleportLabel) : copy.here,
            detail: teleportLabel ?? '',
          },
          ...memory.recent,
        ]
      : memory.recent;

  const isHere = (pick: TravelPick) =>
    pick.kind === 'here' ? !isTeleported : isTeleported && pick.placeId === teleportId;

  const run = async (move: TravelMove, city: TravelCity | null) => {
    try {
      await travel.move(move);
      onBack();
    } catch (e) {
      // A lapsed subscription: the paywall says why. Anything else shows under the search box.
      if (isFeedError(e) && e.code === 'paymentRequired') {
        travel.reset();
        onPaywall(city ? { name: city.name } : null, homeCountry);
      }
    }
  };

  const choose = (city: TravelCity | null) => {
    if (travel.pending) return;
    const pick: TravelPick = city ? { kind: 'city', placeId: city.placeId } : { kind: 'here' };
    const choice = travelChoice(pick, here, isPro);
    switch (choice.kind) {
      case 'stay':
        return onBack();
      case 'paywall':
        return onPaywall(city ? { name: city.name } : null, homeCountry);
      case 'returnHome':
        return void run({ kind: 'returnHome' }, null);
      case 'teleport':
        return city ? void run({ kind: 'teleport', city }, city) : undefined;
    }
  };

  const badge = (city: TravelCity): Badge =>
    isHere({ kind: 'city', placeId: city.placeId }) ? 'none' : isPro ? 'travel' : 'pro';
  const busy = (city: TravelCity | null) => {
    const pending = travel.pending;
    if (!pending) return false;
    if (pending.kind === 'returnHome') return city === null;
    return city !== null && pending.city.placeId === city.placeId;
  };
  const moveError =
    travel.error && travel.error !== 'paymentRequired'
      ? travel.error === 'notACity'
        ? copy.moveFailed.notACity
        : travel.error === 'unavailable'
          ? copy.moveFailed.unavailable
          : travel.error === 'network'
            ? copy.moveFailed.network
            : copy.moveFailed.other
      : null;

  const cityRow = (city: TravelCity) => (
    <CityRow
      name={city.name}
      detail={city.detail}
      leading="earth"
      selected={isHere({ kind: 'city', placeId: city.placeId })}
      badge={badge(city)}
      busy={busy(city)}
      onPress={() => choose(city)}
    />
  );

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
            searching && !results && !search.failed ? (
              <NativeSpinner size={14} color={palette.inkSecondary} />
            ) : undefined
          }
          onChangeText={search.setQuery}
          testID="travel-search"
        />
        {moveError ? (
          <Text variant="bodySm" tone="destructive" className="mt-8" accessibilityLiveRegion="polite">
            {moveError}
          </Text>
        ) : null}
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
              onPress={() => onPaywall(null, homeCountry)}
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
                  gap: 12,
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
            {search.failed ? (
              <View className="flex-row flex-wrap items-center" style={{ gap: 12 }}>
                <Text variant="bodySm" tone="muted" style={{ flexShrink: 1 }} accessibilityLiveRegion="polite">
                  {search.placesDown ? copy.placesFailed : copy.searchFailed}
                </Text>
                <Button label={copy.retry} size="sm" variant="secondary" onPress={search.retry} />
              </View>
            ) : results && results.length === 0 ? (
              <Text variant="bodySm" tone="muted">
                {copy.noResults}
              </Text>
            ) : null}
            <View style={{ gap: 12 }}>
              {(results ?? []).map((city) => (
                <Animated.View key={city.placeId} entering={FadeIn.duration(180)}>
                  {cityRow(city)}
                </Animated.View>
              ))}
            </View>
          </View>
        ) : (
          <Animated.View entering={enterRise(80)}>
            <Text variant="bodySm" tone="muted" className="mb-12">
              {copy.yourLocation}
            </Text>
            <CityRow
              name={copy.yourLocation}
              detail={copy.yourLocationBody(memory.here)}
              leading="location"
              selected={isHere({ kind: 'here' })}
              badge="none"
              busy={busy(null)}
              onPress={() => choose(null)}
            />
            {recent.length > 0 ? (
              <>
                <Text variant="bodySm" tone="muted" className="mb-12 mt-24">
                  {copy.recent}
                </Text>
                <View style={{ gap: 12 }}>
                  {recent.map((city) => (
                    <View key={city.placeId}>{cityRow(city)}</View>
                  ))}
                </View>
              </>
            ) : null}
            <Text variant="bodySm" tone="muted" className="mt-24 text-center">
              {copy.searchHint}
            </Text>
          </Animated.View>
        )}
      </ScrollView>
    </Screen>
  );
}

type Badge = 'pro' | 'travel' | 'none';

/** The tag on a city, or a spinner while Travel is moving the feed there. */
function CityBadge({ badge, busy = false }: { badge: Badge; busy?: boolean }) {
  // In a Host: a native (SwiftUI) spinner bare in a React Native row crashes the app.
  if (busy)
    return (
      <Host matchContents pointerEvents="none">
        <NativeSpinner size={14} color={palette.inkSecondary} />
      </Host>
    );
  return badge === 'pro' ? <ProTag /> : badge === 'travel' ? <TravelTag /> : null;
}

function CityRow({
  name,
  detail,
  leading,
  selected,
  badge,
  busy,
  onPress,
}: {
  name: string;
  detail: string;
  /** The globe for a city; the location arrow for the phone's own place. */
  leading: 'earth' | 'location';
  selected: boolean;
  badge: Badge;
  busy: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected, busy }}
      accessibilityLabel={[name, detail, badge === 'pro' ? 'Pro' : null].filter(Boolean).join(', ')}
    >
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
            paddingVertical: 12,
            gap: 14,
            opacity: pressed ? 0.7 : 1,
          }}
        >
          {leading === 'earth' ? (
            <SvgIcon name="earth" size={30} />
          ) : (
            <View style={{ width: 30, alignItems: 'center' }}>
              <Host matchContents pointerEvents="none" ignoreSafeArea="all">
                <NativeIcon source={icons.location} size={20} color={theme.selectedForeground} />
              </Host>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text variant="bodyMd" style={selected ? { color: theme.selectedForeground } : undefined}>
              {name}
            </Text>
            {detail ? (
              <Text variant="bodySm" tone="muted" style={selected ? { color: palette.ink } : undefined}>
                {detail}
              </Text>
            ) : null}
          </View>
          {selected ? (
            <Host matchContents pointerEvents="none" ignoreSafeArea="all">
              <NativeIcon source={icons.check} size={16} color={theme.selectedForeground} />
            </Host>
          ) : (
            <CityBadge badge={badge} busy={busy} />
          )}
        </View>
      )}
    </Pressable>
  );
}
