import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

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

import { MAX_DESTINATIONS, POPULAR_DESTINATIONS, toggle } from '../../domain/rules/profileSetupRules';
import { chipToneFor } from '../chipTones';
import { SetupHeader } from '../components/SetupHeader';
import { SetupIntro } from '../components/SetupIntro';
import { SECTION_GAP, SetupScreen } from '../components/SetupScreen';
import { setupCopy } from '../copy';
import { useCitySearch } from '../hooks/useCitySearch';
import { useProfileSetup } from '../state/ProfileSetupContext';

/**
 * "Where do you love to travel?", step 3 of 4: up to ten destinations from the
 * popular list or the search (`GET /cities?q=`), with the count beside the list.
 *
 * A searched city joins the chips at the end of the list, chosen. Once ten are
 * chosen the rest dim and stop responding until one is let go.
 *
 * Not saved: there is no favourites field in the backend yet (API map §12), so —
 * as agreed with product — the choices are dropped with the setup draft.
 */
export function DestinationsScreen({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) {
  const theme = useTheme();
  const { draft, update } = useProfileSetup();
  const search = useCitySearch(5);
  // The field keeps its own text; a new key empties it once a result is picked.
  const [fieldKey, setFieldKey] = useState(0);
  const copy = setupCopy.destinations;
  const chosen = draft.destinations;
  const full = chosen.length >= MAX_DESTINATIONS;
  // Searched picks that are not in the popular list are shown after it.
  const options = [...POPULAR_DESTINATIONS, ...chosen.filter((d) => !POPULAR_DESTINATIONS.includes(d))];

  const choose = (name: string) => update({ destinations: toggle(chosen, name, MAX_DESTINATIONS) });

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
                    choose(city.name);
                    search.clear();
                    setFieldKey((k) => k + 1);
                  }}
                  disabled={full && !chosen.includes(city.name)}
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
            {options.map((name) => (
              <Chip
                key={name}
                label={name}
                selected={chosen.includes(name)}
                disabled={full}
                tone={chipToneFor(name)}
                onPress={() => choose(name)}
              />
            ))}
          </ChipGroup>
        </Animated.View>
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
