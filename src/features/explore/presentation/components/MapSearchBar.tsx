import { Host } from '@expo/ui';
import { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { GlassSurface, NativeIcon, NativeSpinner, Text, TextField, icons } from '@shared/components';
import { useLiquidGlass } from '@shared/hooks/useLiquidGlass';
import { useTheme } from '@shared/hooks/useTheme';

import type { PlaceResult } from '../../domain/entities/Explore';
import { exploreCopy } from '../copy';
import { usePlaceSearch } from '../hooks/usePlaceSearch';
import { MapButton } from './MapButton';

/**
 * The top of the map: "Search city or country..." and the filter button beside
 * it. Matches drop down under the field as a card; choosing one moves the map
 * there and clears the search. The list fades in and out in 150ms.
 */
export function MapSearchBar({
  onChoose,
  onOpenFilters,
  filtersActive,
}: {
  onChoose: (place: PlaceResult) => void;
  onOpenFilters: () => void;
  filtersActive: boolean;
}) {
  const theme = useTheme();
  const glass = useLiquidGlass();
  const [text, setText] = useState('');
  // Remounting the uncontrolled field is how it is cleared.
  const [fieldKey, setFieldKey] = useState(0);
  const search = usePlaceSearch(text);

  const choose = (place: PlaceResult) => {
    setText('');
    setFieldKey((k) => k + 1);
    onChoose(place);
  };

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
            onChangeText={setText}
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => {
              const first = search.places[0];
              if (first) choose(first);
            }}
            leading={<NativeIcon source={icons.search} size={16} color={theme.muted} />}
            trailing={search.searching ? <NativeSpinner size={14} color={theme.muted} /> : undefined}
          />
        </GlassSurface>
        <MapButton
          icon={icons.filter}
          accessibilityLabel={filtersActive ? exploreCopy.map.filtersActive : exploreCopy.map.filters}
          onPress={onOpenFilters}
          badge={filtersActive}
        />
      </View>
      {search.active && !search.searching ? (
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
          {search.places.length === 0 ? (
            <Text variant="bodySm" tone="muted" className="px-16 py-12">
              {exploreCopy.map.noPlaces}
            </Text>
          ) : (
            search.places.map((place) => (
              <TouchableOpacity
                activeOpacity={0.6}
                key={place.id}
                onPress={() => choose(place)}
                accessibilityRole="button"
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
                  {place.label}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </Animated.View>
      ) : null}
    </View>
  );
}
