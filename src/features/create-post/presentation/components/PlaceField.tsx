import { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Host, NativeIcon, NativeSpinner, SelectField, Text, TextField, icons } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

import type { Coordinates, DraftPlace, PlaceOption, PlaceSearchKind } from '../../domain/entities/PostDraft';
import { wizardCopy } from '../copy';
import { usePlaceSearch } from '../hooks/usePlaceSearch';

/**
 * A place picker searched in place, rather than on another screen: typing lists
 * Google's suggestions under the field, and tapping one looks up its address
 * and coordinates (`@core/places`). Suggestions fade in over 180ms.
 *
 * Two ways to use it:
 *
 * - `kind="cities"` (a Plan's destination, a Group's location): pick only.
 *   Once chosen the field shows the city; tapping it searches again.
 * - `kind="places"` (a meeting point or venue): what is typed is kept as the
 *   meeting point whether or not a suggestion is picked, so a place Google
 *   doesn't know, or search being down, never stops the host. A typed place is
 *   found by the phone's geocoder when they move on; a picked one is sent by
 *   its Google id. Under a picked venue, its address.
 */

type Common = {
  label: string;
  placeholder: string;
  /** Ranks places around this point first (a meeting point near the destination). */
  near?: Coordinates | null;
  error?: string | null;
  maxLength?: number;
  testID?: string;
};

export type PlaceFieldProps =
  | (Common & {
      kind: 'cities';
      value: DraftPlace | null;
      onPick: (place: DraftPlace) => void;
      /** Tapping a chosen city clears it to search again. */
      onClear: () => void;
    })
  | (Common & {
      kind: 'places';
      /** The meeting point as typed (or the picked venue's name). */
      text: string;
      onChangeText: (text: string) => void;
      /** The venue picked for `text`, if any. */
      value: DraftPlace | null;
      onPick: (place: DraftPlace) => void;
    });

export function PlaceField(props: PlaceFieldProps) {
  const theme = useTheme();
  const search = usePlaceSearch(props.kind, props.near ?? null);
  // Bumped on each pick, so the native field starts afresh with the picked name. Not keyed on
  // the venue itself: typing over a venue clears it, and must not remount the field mid-word.
  const [picks, setPicks] = useState(0);
  const { label, placeholder, error, maxLength, testID } = props;

  const choose = async (option: PlaceOption) => {
    const place = await search.pick(option);
    if (!place) return;
    setPicks((n) => n + 1);
    props.onPick(place);
  };

  if (props.kind === 'cities' && props.value) {
    const chosen = props.value;
    return (
      <Animated.View entering={FadeIn.duration(180)}>
        <SelectField
          label={label}
          value={chosen.address || chosen.name}
          placeholder={placeholder}
          icon={icons.search}
          onPress={() => {
            search.setQuery('');
            props.onClear();
          }}
          error={error}
          testID={testID}
        />
      </Animated.View>
    );
  }

  const venue = props.kind === 'places' ? props.value : null;
  const helper = search.picking
    ? wizardCopy.places.looking
    : search.failed && props.kind === 'places'
      ? `${wizardCopy.places.unavailable} ${wizardCopy.places.typeInstead}`
      : (venue?.address ?? null);

  return (
    <Animated.View>
      <TextField
        key={picks}
        label={label}
        placeholder={placeholder}
        defaultValue={props.kind === 'places' ? props.text : ''}
        onChangeText={(text) => {
          search.setQuery(text);
          if (props.kind === 'places') props.onChangeText(text);
        }}
        autoCorrect={false}
        autoCapitalize="words"
        returnKeyType="search"
        maxLength={maxLength}
        error={error}
        helper={helper}
        testID={testID}
        trailing={
          search.loading || search.picking ? (
            <NativeSpinner size={14} color={theme.muted} />
          ) : (
            <NativeIcon source={icons.search} size={16} color={theme.muted} />
          )
        }
      />
      {search.tooShort && !(search.failed && props.kind === 'cities') ? null : (
        <Suggestions
          kind={props.kind}
          results={search.results}
          loading={search.loading}
          failed={search.failed}
          picking={search.picking}
          onChoose={(option) => void choose(option)}
        />
      )}
    </Animated.View>
  );
}

function Suggestions({
  kind,
  results,
  loading,
  failed,
  picking,
  onChoose,
}: {
  kind: PlaceSearchKind;
  results: PlaceOption[];
  loading: boolean;
  failed: boolean;
  picking: string | null;
  onChoose: (option: PlaceOption) => void;
}) {
  const theme = useTheme();
  // A meeting point says search is down under the field, where it also says to keep typing.
  if (failed && kind === 'places') return null;
  return (
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
      {failed ? (
        <Text variant="bodySm" tone="destructive" className="p-12" accessibilityLiveRegion="polite">
          {wizardCopy.places.unavailable}
        </Text>
      ) : !loading && results.length === 0 ? (
        <Text variant="bodySm" tone="muted" className="p-12" accessibilityLiveRegion="polite">
          {kind === 'cities' ? wizardCopy.places.noCities : wizardCopy.places.noPlaces}
        </Text>
      ) : (
        results.slice(0, 6).map((option, i) => (
          <TouchableOpacity
            activeOpacity={0.6}
            key={option.placeId}
            onPress={() => onChoose(option)}
            disabled={picking !== null}
            accessibilityRole="button"
            accessibilityLabel={option.detail ? `${option.name}, ${option.detail}` : option.name}
            accessibilityState={{ busy: picking === option.placeId, disabled: picking !== null }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingHorizontal: 12,
              paddingVertical: 12,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: theme.border,
              opacity: picking !== null && picking !== option.placeId ? 0.5 : 1,
            }}
          >
            <Host matchContents pointerEvents="none" ignoreSafeArea="all">
              <NativeIcon source={icons.location} size={14} color={theme.muted} />
            </Host>
            {/* Name and area stack, so a long name or a large text size wraps instead of clipping. */}
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="bodySm">{option.name}</Text>
              {option.detail ? (
                <Text variant="bodyXs" tone="muted">
                  {option.detail}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        ))
      )}
    </Animated.View>
  );
}
