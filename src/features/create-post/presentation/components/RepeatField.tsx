import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Chip, ChipGroup, SelectField, Text, TextLink, icons } from '@shared/components';

import type { Recurrence } from '../../domain/entities/PostDraft';
import { wizardCopy } from '../copy';

/**
 * A Group's "Repeats" (not drawn; the API's `recurrence`): one of Doesn't
 * repeat, Weekly, Every 2 weeks or Monthly, as chips that wrap at large text
 * sizes. While it repeats, an optional last date follows (`recurrenceEndsOn`);
 * left empty it repeats until the host stops it. The date field fades in.
 */

export type RepeatFieldProps = {
  value: Recurrence | null;
  onChange: (value: Recurrence | null) => void;
  /** The last date, formatted, or null for "until stopped". */
  endsOn: string | null;
  onPickEndsOn: () => void;
  onClearEndsOn: () => void;
  error?: string | null;
  endsOnError?: string | null;
};

export function RepeatField({
  value,
  onChange,
  endsOn,
  onPickEndsOn,
  onClearEndsOn,
  error,
  endsOnError,
}: RepeatFieldProps) {
  const copy = wizardCopy.repeat;
  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 8 }}>
        <Text variant="labelXs" tone="muted">
          {copy.label}
        </Text>
        <View accessibilityRole="radiogroup" accessibilityLabel={copy.label}>
          <ChipGroup>
            {copy.options.map((option) => (
              <Chip
                key={option.label}
                label={option.label}
                role="radio"
                selected={value === option.value}
                onPress={() => onChange(option.value)}
                testID={`create-repeat-${option.value ?? 'none'}`}
              />
            ))}
          </ChipGroup>
        </View>
        {error ? (
          <Text variant="bodySm" tone="destructive" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : value ? (
          <Text variant="bodySm" tone="muted">
            {copy.hint}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)} style={{ gap: 8 }}>
          <SelectField
            label={copy.endsOn}
            value={endsOn}
            placeholder={copy.untilStopped}
            icon={icons.calendar}
            onPress={onPickEndsOn}
            error={endsOnError}
            testID="create-repeat-ends-on"
          />
          {endsOn ? (
            <View style={{ alignSelf: 'flex-start' }}>
              <TextLink label={copy.clearEndsOn} onPress={onClearEndsOn} emphasis="plain" />
            </View>
          ) : null}
        </Animated.View>
      ) : null}
    </View>
  );
}
