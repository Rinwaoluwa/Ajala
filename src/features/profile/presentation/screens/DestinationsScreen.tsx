import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import {
  Button,
  Chip,
  ChipGroup,
  LoadingRing,
  NativeIcon,
  NativeSpinner,
  Text,
  TextField,
  enterRise,
  icons,
} from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { palette } from '@shared/theme';

import type { CityRef } from '../../domain/entities/Profile';
import { MAX_DESTINATIONS } from '../../domain/rules/profileSetupRules';
import { chipToneFor } from '../chipTones';
import { SetupHeader } from '../components/SetupHeader';
import { SetupIntro } from '../components/SetupIntro';
import { SECTION_GAP, SetupScreen } from '../components/SetupScreen';
import { setupCopy } from '../copy';
import { useCitySearch } from '../hooks/useCitySearch';
import { usePopularCities } from '../hooks/usePopularCities';
import { useProfileSetup } from '../state/ProfileSetupContext';

/**
 * "Where do you love to travel?", step 3 of 4: up to ten destinations from the
 * server's popular cities (`GET /cities/popular`) or the search
 * (`GET /cities?q=`), with the count beside the list. Saved with the rest of
 * setup as `extras.favouriteCityIds`.
 *
 * A searched city joins the chips at the end of the list, chosen. Once ten are
 * chosen the rest dim and stop responding until one is let go. Chips are keyed
 * by city id, so two cities with one name stay apart.
 */
export function DestinationsScreen({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) {
  const theme = useTheme();
  const { draft, update } = useProfileSetup();
  const search = useCitySearch(5);
  const popular = usePopularCities();
  // The field keeps its own text; a new key empties it once a result is picked.
  const [fieldKey, setFieldKey] = useState(0);
  const copy = setupCopy.destinations;
  const chosen = draft.destinations;
  const chosenIds = new Set(chosen.map((c) => c.id));
  const full = chosen.length >= MAX_DESTINATIONS;
  // Picks that are not in the popular list (searched, or saved earlier) are shown after it.
  const popularIds = new Set(popular.cities.map((c) => c.id));
  const options: CityRef[] = [...popular.cities, ...chosen.filter((c) => !popularIds.has(c.id))];

  const choose = (city: CityRef) => {
    if (chosenIds.has(city.id)) update({ destinations: chosen.filter((c) => c.id !== city.id) });
    else if (!full) update({ destinations: [...chosen, city] });
  };

  return (
    <SetupScreen header={<SetupHeader step={2} onBack={onBack} />}>
      <SetupIntro title={copy.title} body={copy.body} />

      <Animated.View entering={enterRise(60)} style={{ marginTop: SECTION_GAP }}>
        <TextField
          key={fieldKey}
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
            {search.results.length === 0 ? (
              <Text variant="bodySm" tone="muted" className="py-8">
                {copy.noMatches}
              </Text>
            ) : (
              search.results.map((city) => (
                <Pressable
                  key={city.id}
                  onPress={() => {
                    // Picking a city already chosen keeps it chosen rather than letting it go.
                    if (!chosenIds.has(city.id)) choose(city);
                    search.clear();
                    setFieldKey((k) => k + 1);
                  }}
                  disabled={full && !chosenIds.has(city.id)}
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
                        opacity: pressed ? 0.6 : 1,
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
        <View className="mb-12 flex-row items-baseline justify-between">
          <Text variant="bodyMd">{copy.section}</Text>
          <Text
            variant="bodyXs"
            tone="muted"
            accessibilityLabel={`${chosen.length} of ${MAX_DESTINATIONS} chosen`}
          >
            {`${chosen.length}/${MAX_DESTINATIONS}`}
          </Text>
        </View>
        <Animated.View layout={LinearTransition.duration(200)}>
          <ChipGroup>
            {options.map((city) => (
              <Chip
                key={city.id}
                label={city.name}
                selected={chosenIds.has(city.id)}
                disabled={full}
                tone={chipToneFor(city.id)}
                onPress={() => choose(city)}
              />
            ))}
          </ChipGroup>
        </Animated.View>
        {popular.loading ? (
          <View className="mt-12 items-center">
            <LoadingRing size={28} accessibilityLabel="Loading popular destinations" />
          </View>
        ) : popular.failed ? (
          <Animated.View
            entering={FadeIn.duration(180)}
            className="mt-12 flex-row flex-wrap items-center"
            style={{ columnGap: 8, rowGap: 4 }}
          >
            <Text variant="bodySm" tone="muted">
              {copy.popularFailed}
            </Text>
            <Pressable onPress={popular.retry} accessibilityRole="button" hitSlop={8}>
              {({ pressed }) => (
                <Text variant="labelSm" tone="primary" style={{ opacity: pressed ? 0.6 : 1 }}>
                  {copy.retry}
                </Text>
              )}
            </Pressable>
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
