import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import {
  Button,
  Chip,
  ChipGroup,
  NativeIcon,
  NativeSpinner,
  Text,
  TextField,
  enterRise,
  icons,
} from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { palette } from '@shared/theme';

import type { PlaceRef } from '../../domain/entities/Profile';
import { MAX_DESTINATIONS, POPULAR_DESTINATION_SEARCHES } from '../../domain/rules/profileSetupRules';
import { chipToneFor } from '../chipTones';
import { SetupHeader } from '../components/SetupHeader';
import { SetupIntro } from '../components/SetupIntro';
import { SECTION_GAP, SetupScreen } from '../components/SetupScreen';
import { setupCopy } from '../copy';
import { useCitySearch } from '../hooks/useCitySearch';
import { useProfileSetup } from '../state/ProfileSetupContext';

/**
 * "Where do you love to travel?", step 3 of 4: up to ten cities from a Google
 * cities search (`useCitySearch`), with the count beside them. Saved with the
 * rest of setup as `extras.favouriteDestinationIds` (an 11th is a 400, so the
 * list stops at ten).
 *
 * The API no longer ranks popular cities, so under the picks sits a fixed list
 * of well-known cities (`POPULAR_DESTINATION_SEARCHES`). Tapping one puts its
 * name in the search rather than adding a guessed place: the person still
 * picks the real Google city from the results. Names already chosen drop out
 * of that list, and it hides once ten are chosen.
 *
 * Chosen cities are chips, keyed by place id so two cities with one name stay
 * apart; tapping one lets it go.
 */
export function DestinationsScreen({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) {
  const theme = useTheme();
  const { draft, update } = useProfileSetup();
  const search = useCitySearch(5);
  // The field keeps its own text: a new key empties it after a pick, or fills it with a quick search.
  const [field, setField] = useState({ key: 0, text: '' });
  const copy = setupCopy.destinations;
  const chosen = draft.destinations;
  const chosenIds = new Set(chosen.map((c) => c.placeId));
  const chosenNames = new Set(chosen.map((c) => c.name.toLowerCase()));
  const full = chosen.length >= MAX_DESTINATIONS;
  const quickSearches = full
    ? []
    : POPULAR_DESTINATION_SEARCHES.filter((name) => !chosenNames.has(name.toLowerCase()));

  const remove = (city: PlaceRef) => update({ destinations: chosen.filter((c) => c.placeId !== city.placeId) });

  const pick = (city: PlaceRef) => {
    // Picking a city already chosen keeps it chosen rather than letting it go.
    if (!chosenIds.has(city.placeId) && !full) update({ destinations: [...chosen, city] });
    search.finish();
    setField((f) => ({ key: f.key + 1, text: '' }));
  };

  const searchFor = (name: string) => {
    search.setQuery(name);
    setField((f) => ({ key: f.key + 1, text: name }));
  };

  return (
    <SetupScreen header={<SetupHeader step={2} onBack={onBack} />}>
      <SetupIntro title={copy.title} body={copy.body} />

      <Animated.View entering={enterRise(60)} style={{ marginTop: SECTION_GAP }}>
        <TextField
          key={field.key}
          defaultValue={field.text}
          label={copy.search}
          labelHidden
          placeholder={copy.search}
          filled
          autoCorrect={false}
          returnKeyType="search"
          leading={<NativeIcon source={icons.search} size={16} color={palette.inkSecondary} />}
          trailing={search.searching ? <NativeSpinner size={14} color={palette.inkSecondary} /> : undefined}
          onChangeText={search.setQuery}
          testID="destinations-search-field"
        />
        {!search.tooShort && (search.results.length > 0 || !search.searching) ? (
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)} className="mt-8">
            {search.failure || search.results.length === 0 ? (
              <Text variant="bodySm" tone="muted" className="py-8" accessibilityLiveRegion="polite">
                {search.failure ?? copy.noMatches}
              </Text>
            ) : (
              search.results.map((city) => (
                <Pressable
                  key={city.placeId}
                  onPress={() => pick(city)}
                  disabled={full && !chosenIds.has(city.placeId)}
                  accessibilityRole="button"
                  accessibilityLabel={city.label}
                >
                  {({ pressed }) => (
                    <View
                      style={{
                        minHeight: 44,
                        justifyContent: 'center',
                        borderBottomWidth: 1,
                        borderBottomColor: theme.border,
                        opacity: pressed ? 0.6 : full && !chosenIds.has(city.placeId) ? 0.4 : 1,
                      }}
                    >
                      <Text variant="bodySm">{city.label}</Text>
                    </View>
                  )}
                </Pressable>
              ))
            )}
          </Animated.View>
        ) : null}
      </Animated.View>

      <Animated.View entering={enterRise(120)} style={{ marginTop: 24 }}>
        <View className="mb-12 flex-row flex-wrap items-baseline justify-between" style={{ columnGap: 8 }}>
          <Text variant="bodyMd">{copy.section}</Text>
          <Text
            variant="bodyXs"
            tone="muted"
            accessibilityLabel={`${chosen.length} of ${MAX_DESTINATIONS} chosen`}
          >
            {`${chosen.length}/${MAX_DESTINATIONS}`}
          </Text>
        </View>
        <Animated.View>
          {chosen.length ? (
            <ChipGroup wrap>
              {chosen.map((city) => (
                <Chip
                  key={city.placeId}
                  label={city.name}
                  selected
                  tone={chipToneFor(city.name)}
                  onPress={() => remove(city)}
                />
              ))}
            </ChipGroup>
          ) : (
            <Text variant="bodySm" tone="muted">
              {copy.noneChosen}
            </Text>
          )}
        </Animated.View>

        {quickSearches.length ? (
          <Animated.View style={{ marginTop: 20 }}>
            <Text variant="labelSm" tone="muted" className="mb-8">
              {copy.tryASearch}
            </Text>
            <ChipGroup wrap>
              {quickSearches.map((name) => (
                <Chip
                  key={name}
                  label={name}
                  selected={false}
                  tone={chipToneFor(name)}
                  onPress={() => searchFor(name)}
                  testID={`destinations-quick-${name}`}
                />
              ))}
            </ChipGroup>
          </Animated.View>
        ) : null}
      </Animated.View>

      <View style={{ marginTop: 36 }}>
        <Button
          label={setupCopy.continue}
          size="lg"
          fullWidth
          disabled={chosen.length === 0}
          onPress={onContinue}
          testID="setup-destinations-continue"
        />
      </View>
    </SetupScreen>
  );
}
