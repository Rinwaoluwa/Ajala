import { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Avatar, Host, GlassSurface, NativeIcon, NativeSpinner, Text, TextField, icons } from '@shared/components';
import { useDebouncedValue } from '@shared/hooks/useDebouncedValue';
import { useLiquidGlass } from '@shared/hooks/useLiquidGlass';
import { useTheme } from '@shared/hooks/useTheme';

import type { FoundPerson, PlaceLocation, PlaceResult } from '../../domain/entities/Explore';
import { exploreCopy } from '../copy';
import { usePlaceSearch } from '../hooks/usePlaceSearch';
import { useSearchPeople } from '../hooks/useSearchPeople';
import { MapButton } from './MapButton';

/**
 * The top of the map: "Search cities or people..." and the filter button beside
 * it. As the person types (two letters or more, after a 300ms pause), matches
 * drop down under the field in one card, in two parts:
 *
 *   - Places: cities from Google. Choosing one looks up where it is, moves the
 *     map there and clears the search.
 *   - People: from `GET /search/people`, up to five, each with their photo,
 *     name and @handle. Choosing one opens their profile.
 *
 * Each part reports its own trouble ("Place search isn't available right now",
 * "Couldn't search for people right now") without hiding the other. The card
 * fades in and out in 150ms.
 */
const PEOPLE_SHOWN = 5;

export function MapSearchBar({
  onChoose,
  onOpenPerson,
  onOpenFilters,
  filtersActive,
}: {
  onChoose: (location: PlaceLocation) => void;
  onOpenPerson: (userId: string) => void;
  onOpenFilters: () => void;
  filtersActive: boolean;
}) {
  const theme = useTheme();
  const glass = useLiquidGlass();
  const [text, setText] = useState('');
  // Remounting the uncontrolled field is how it is cleared.
  const [fieldKey, setFieldKey] = useState(0);
  const search = usePlaceSearch(text);
  const words = useDebouncedValue(text.trim(), 300);
  const people = useSearchPeople(words.length >= 2 ? words : null, true);
  const peopleShown = people.items.slice(0, PEOPLE_SHOWN);
  const peopleSettled = !people.loading;

  const choose = async (place: PlaceResult) => {
    if (search.locating) return;
    const location = await search.locate(place.placeId);
    if (!location) return;
    setText('');
    setFieldKey((k) => k + 1);
    onChoose(location);
  };
  const failed = search.failed || search.locateFailed;
  const clear = () => {
    setText('');
    setFieldKey((k) => k + 1);
  };
  const openPerson = (person: FoundPerson) => {
    clear();
    onOpenPerson(person.id);
  };
  const placesSettled = !search.searching || failed;

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
            clearable
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
      {search.active && (placesSettled || peopleSettled) ? (
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
          <SectionHeading label={exploreCopy.map.placesHeading} />
          {!placesSettled ? (
            <Busy />
          ) : failed ? (
            <Note text={exploreCopy.map.placesFailed} live />
          ) : search.places.length === 0 ? (
            <Note text={exploreCopy.map.noPlaces} />
          ) : (
            search.places.map((place) => (
              <TouchableOpacity
                activeOpacity={0.6}
                key={place.placeId}
                onPress={() => void choose(place)}
                accessibilityRole="button"
                accessibilityLabel={[place.name, place.detail].filter(Boolean).join(', ')}
                style={ROW}
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

          <View style={{ height: 1, marginHorizontal: 16, marginVertical: 4, backgroundColor: theme.border }} />
          <SectionHeading label={exploreCopy.map.peopleHeading} />
          {!peopleSettled ? (
            <Busy />
          ) : people.error ? (
            <Note text={exploreCopy.map.peopleFailed} live />
          ) : peopleShown.length === 0 ? (
            <Note text={exploreCopy.map.noPeople} />
          ) : (
            peopleShown.map((person) => (
              <TouchableOpacity
                activeOpacity={0.6}
                key={person.id}
                onPress={() => openPerson(person)}
                accessibilityRole="button"
                accessibilityLabel={exploreCopy.list.openPerson(person.displayName)}
                style={ROW}
              >
                <Avatar name={person.displayName} uri={person.avatarUrl} size={28} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodySm" numberOfLines={1}>
                    {person.displayName}
                  </Text>
                  {person.handle ? (
                    <Text variant="bodyXs" tone="muted" numberOfLines={1}>
                      {`@${person.handle}`}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))
          )}
        </Animated.View>
      ) : null}
    </View>
  );
}

const ROW = {
  minHeight: 44,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  paddingHorizontal: 16,
  paddingVertical: 8,
} as const;

function SectionHeading({ label }: { label: string }) {
  return (
    <Text variant="labelXs" tone="muted" className="px-16 pt-8 pb-2" accessibilityRole="header">
      {label}
    </Text>
  );
}

function Note({ text, live = false }: { text: string; live?: boolean }) {
  return (
    <Text variant="bodySm" tone="muted" className="px-16 py-8" accessibilityLiveRegion={live ? 'polite' : undefined}>
      {text}
    </Text>
  );
}

function Busy() {
  const theme = useTheme();
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 10, alignItems: 'flex-start' }}>
      <Host matchContents>
        <NativeSpinner size={14} color={theme.muted} />
      </Host>
    </View>
  );
}
