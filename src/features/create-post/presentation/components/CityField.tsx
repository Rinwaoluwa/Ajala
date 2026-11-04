import { Host } from '@expo/ui';
import { TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { NativeIcon, NativeSpinner, SelectField, Text, TextField, icons } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

import type { DraftCity } from '../../domain/entities/PostDraft';
import { wizardCopy } from '../copy';
import { useCitySearch } from '../hooks/useCitySearch';

/**
 * "Destination: Select city or destination" (a Plan) or "Location" (a Group).
 *
 * Searched in place rather than on another screen: typing lists catalog cities
 * under the field, and tapping one fills it. Once chosen the field shows the
 * city; tapping it searches again. Suggestions fade in over 180ms.
 */

export type CityFieldProps = {
  label: string;
  placeholder: string;
  value: DraftCity | null;
  onChange: (city: DraftCity | null) => void;
};

export function CityField({ label, placeholder, value, onChange }: CityFieldProps) {
  const theme = useTheme();
  const search = useCitySearch();

  if (value) {
    return (
      <Animated.View entering={FadeIn.duration(180)}>
        <SelectField
          label={label}
          value={value.label}
          placeholder={placeholder}
          icon={icons.search}
          onPress={() => {
            search.setQuery('');
            onChange(null);
          }}
        />
      </Animated.View>
    );
  }

  return (
    <Animated.View layout={LinearTransition.duration(200)}>
      <TextField
        label={label}
        placeholder={placeholder}
        onChangeText={search.setQuery}
        autoCorrect={false}
        returnKeyType="search"
        trailing={
          search.loading ? (
            <NativeSpinner size={14} color={theme.muted} />
          ) : (
            <NativeIcon source={icons.search} size={16} color={theme.muted} />
          )
        }
      />
      {search.tooShort ? null : (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(120)}
          style={{
            marginTop: 6,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.card,
            overflow: 'hidden',
          }}
        >
          {search.failed ? (
            <Text variant="bodySm" tone="destructive" className="p-12" accessibilityLiveRegion="polite">
              {wizardCopy.city.failed}
            </Text>
          ) : !search.loading && search.results.length === 0 ? (
            <Text variant="bodySm" tone="muted" className="p-12" accessibilityLiveRegion="polite">
              {wizardCopy.city.empty}
            </Text>
          ) : (
            search.results.slice(0, 6).map((city, i) => (
              <TouchableOpacity
                activeOpacity={0.6}
                key={city.id}
                onPress={() => onChange(city)}
                accessibilityRole="button"
                accessibilityLabel={city.label}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: theme.border,
                  backgroundColor: 'transparent',
                }}
              >
                <Host matchContents pointerEvents="none" ignoreSafeArea="all">
                  <NativeIcon source={icons.location} size={14} color={theme.muted} />
                </Host>
                <View style={{ flex: 1 }}>
                  <Text variant="bodySm">{city.label}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </Animated.View>
      )}
    </Animated.View>
  );
}
