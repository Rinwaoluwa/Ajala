import { Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { NativeIcon, NativeSpinner, Screen, ScreenHeader, Text, TextField, icons } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { layout, palette } from '@shared/theme';

import type { City } from '../../domain/entities/Profile';
import { profileErrorMessages, setupCopy } from '../copy';
import { useCitySearch } from '../hooks/useCitySearch';
import { useProfileSetup } from '../state/ProfileSetupContext';

/**
 * Choosing "Current city" by hand (`GET /cities?q=`): when location could not
 * find it, or found the wrong one. Not drawn: built from the setup's own search
 * field and the app's list typography. Results fade in as they land; picking one
 * goes straight back.
 */

export function CitySearchScreen({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const theme = useTheme();
  const { update } = useProfileSetup();
  const search = useCitySearch();
  const copy = setupCopy.citySearch;

  const choose = (city: City) => {
    update({ homeCity: city, cityDetected: false });
    onDone();
  };

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      <View className="px-20">
        <ScreenHeader title={copy.title} onBack={onBack} />
        <View className="mt-16">
          <TextField
            label={copy.title}
            placeholder={copy.placeholder}
            filled
            labelHidden
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            leading={<NativeIcon source={icons.search} size={16} color={palette.inkSecondary} />}
            trailing={search.searching ? <NativeSpinner size={14} color={palette.inkSecondary} /> : undefined}
            onChangeText={search.setQuery}
            testID="city-search-field"
          />
        </View>
      </View>

      <Animated.FlatList
        data={search.results}
        keyExtractor={(city) => city.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{
          paddingHorizontal: layout.screenGutter,
          paddingTop: 12,
          paddingBottom: 24,
        }}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: theme.border }} />}
        ListEmptyComponent={
          <Text variant="bodySm" tone="muted" className="mt-12">
            {search.failed
              ? profileErrorMessages.network
              : search.tooShort
                ? copy.hint
                : search.searching
                  ? ' '
                  : copy.empty}
          </Text>
        }
        renderItem={({ item }) => (
          <Animated.View entering={FadeIn.duration(180)}>
            <Pressable
              onPress={() => choose(item)}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              {({ pressed }) => (
                <View
                  style={{
                    minHeight: 52,
                    paddingVertical: 10,
                    justifyContent: 'center',
                    opacity: pressed ? 0.6 : 1,
                  }}
                >
                  <Text variant="bodyMd">{item.name}</Text>
                  <Text variant="bodyXs" tone="muted">
                    {[item.region, item.countryName].filter(Boolean).join(', ')}
                  </Text>
                </View>
              )}
            </Pressable>
          </Animated.View>
        )}
      />
    </Screen>
  );
}
