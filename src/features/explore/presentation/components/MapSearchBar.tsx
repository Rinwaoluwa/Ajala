import { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Host, GlassSurface, NativeIcon, NativeSpinner, Text, TextField, icons } from '@shared/components';
import { useLiquidGlass } from '@shared/hooks/useLiquidGlass';
import { useTheme } from '@shared/hooks/useTheme';

import type { PlaceLocation, PlaceResult } from '../../domain/entities/Explore';
import { exploreCopy } from '../copy';
import { usePlaceSearch } from '../hooks/usePlaceSearch';
import { MapButton } from './MapButton';

/**
 * The top of the map: "Search city or country..." and the filter button beside
 * it. Matches (the place search on the phone, cities only) drop down under the
 * field as a card; choosing one looks up where it is, moves the map there and
 * clears the search. The list fades in and out in 150ms. A search that can't
 * run says "Place search isn't available right now" in the same card.
 */
export function MapSearchBar({
  onChoose,
  onOpenFilters,
  filtersActive,
}: {
  onChoose: (location: PlaceLocation) => void;
  onOpenFilters: () => void;
  filtersActive: boolean;
}) {
  const theme = useTheme();
  const glass = useLiquidGlass();
  const [text, setText] = useState('');
  // Remounting the uncontrolled field is how it is cleared.
  const [fieldKey, setFieldKey] = useState(0);
  const search = usePlaceSearch(text);

  const choose = async (place: PlaceResult) => {
    if (search.locating) return;
    const location = await search.locate(place.placeId);
    if (!location) return;
    setText('');
    setFieldKey((k) => k + 1);
    onChoose(location);
  };
  const failed = search.failed || search.locateFailed;

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {/* Glass where the phone has it; otherwise the design's card holding the pale field. */}
        <GlassSurface fallbackColor={theme.card} style={{ flex: 1, borderRadius: glass ? 12 : 8 }}>
          <TextField
            key={fieldKey}
            label={exploreCopy.map.searchPlaceholder}
            labelHidden
            filled={!glass}
            bare={glass}
            placeholder={exploreCopy.map.searchPlaceholder}
            onChangeText={(next) => {
              search.resetLocate();
              setText(next);
            }}
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => {
              const first = search.places[0];
              if (first) void choose(first);
            }}
            leading={<NativeIcon source={icons.search} size={16} color={theme.muted} />}
            trailing={search.searching || search.locating ? <NativeSpinner size={14} color={theme.muted} /> : undefined}
          />
        </GlassSurface>
        <MapButton
          icon={icons.filter}
          accessibilityLabel={filtersActive ? exploreCopy.map.filtersActive : exploreCopy.map.filters}
          onPress={onOpenFilters}
          badge={filtersActive}
        />
      </View>
      {search.active && (!search.searching || failed) ? (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(150)}
          style={{
            marginTop: 6,
            marginRight: 54,
            borderRadius: 12,
            backgroundColor: theme.card,
            paddingVertical: 4,
            shadowColor: '#000',
            shadowOpacity: 0.12,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          }}
        >
          {failed ? (
            <Text variant="bodySm" tone="muted" className="px-16 py-12" accessibilityLiveRegion="polite">
              {exploreCopy.map.placesFailed}
            </Text>
          ) : search.places.length === 0 ? (
            <Text variant="bodySm" tone="muted" className="px-16 py-12">
              {exploreCopy.map.noPlaces}
            </Text>
          ) : (
            search.places.map((place) => (
              <TouchableOpacity
                activeOpacity={0.6}
                key={place.placeId}
                onPress={() => void choose(place)}
                accessibilityRole="button"
                accessibilityLabel={[place.name, place.detail].filter(Boolean).join(', ')}
                style={{
                  minHeight: 44,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  backgroundColor: 'transparent',
                }}
              >
                <Host matchContents pointerEvents="none" ignoreSafeArea="all">
                  <NativeIcon source={icons.location} size={14} color={theme.muted} />
                </Host>
                <Text variant="bodySm" className="flex-1" numberOfLines={2}>
                  {place.name}
                  {place.detail ? (
                    <Text variant="bodySm" tone="muted">{`, ${place.detail}`}</Text>
                  ) : null}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </Animated.View>
      ) : null}
    </View>
  );
}
