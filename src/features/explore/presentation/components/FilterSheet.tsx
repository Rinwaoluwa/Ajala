import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { haptics } from '@shared/feedback/haptics';
import { Button, Sheet, Text, TextField } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

import {
  FILTER_CURRENCY,
  NO_FILTERS,
  readMaxPrice,
  type DateFilter,
  type MapFilters,
  type PriceFilter,
} from '../../domain/rules/exploreRules';
import { exploreCopy } from '../copy';

/**
 * "Filters" (Figma): Date (any, today, this weekend) and Price (any, free,
 * paid), "Maximum price (NGN)", then Reset and Apply filters.
 *
 * The choices are a draft until Apply: closing the sheet keeps the map as it
 * was. Reset puts the draft back to no filters. The maximum is hidden with Free,
 * where it means nothing.
 *
 * `GET /map/pins` takes neither filter, so the map applies them on the phone
 * (`useMapPins`).
 */
export function FilterSheet({
  isPresented,
  value,
  onApply,
  onDismiss,
}: {
  isPresented: boolean;
  value: MapFilters;
  onApply: (filters: MapFilters) => void;
  onDismiss: () => void;
}) {
  const copy = exploreCopy.filters;
  return (
    <Sheet isPresented={isPresented} title={copy.title} onDismiss={onDismiss}>
      {/* Mounted per opening, so the draft starts from what the map shows. */}
      {isPresented ? <FilterForm value={value} onApply={onApply} /> : null}
    </Sheet>
  );
}

function FilterForm({ value, onApply }: { value: MapFilters; onApply: (filters: MapFilters) => void }) {
  const copy = exploreCopy.filters;
  const [draft, setDraft] = useState<MapFilters>(value);
  // Remounting the uncontrolled field is how Reset empties it.
  const [maxKey, setMaxKey] = useState(0);

  const reset = () => {
    setDraft(NO_FILTERS);
    setMaxKey((k) => k + 1);
  };

  return (
    <View style={{ gap: 24 }}>
      <Section title={copy.date}>
        <Options<DateFilter>
          options={[
            { value: 'any', label: copy.anyDate },
            { value: 'today', label: copy.today },
            { value: 'weekend', label: copy.weekend },
          ]}
          value={draft.date}
          onChange={(date) => setDraft((d) => ({ ...d, date }))}
        />
      </Section>

      <Section title={copy.price}>
        <Options<PriceFilter>
          options={[
            { value: 'any', label: copy.anyPrice },
            { value: 'free', label: copy.free },
            { value: 'paid', label: copy.paid },
          ]}
          value={draft.price}
          onChange={(price) => setDraft((d) => ({ ...d, price }))}
        />
        {draft.price !== 'free' ? (
          <View style={{ marginTop: 16 }}>
            <TextField
              key={maxKey}
              label={copy.maxPrice(FILTER_CURRENCY)}
              placeholder={copy.noLimit}
              defaultValue={draft.maxPrice !== null ? String(draft.maxPrice) : ''}
              keyboardType="number-pad"
              returnKeyType="done"
              maxLength={9}
              onChangeText={(text) => setDraft((d) => ({ ...d, maxPrice: readMaxPrice(text) }))}
            />
          </View>
        ) : null}
      </Section>

      <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
        <View style={{ flex: 1 }}>
          <Button label={copy.reset} variant="neutral" size="lg" fullWidth onPress={reset} />
        </View>
        <View style={{ flex: 2 }}>
          <Button
            label={copy.apply}
            size="lg"
            fullWidth
            onPress={() => onApply(draft.price === 'free' ? { ...draft, maxPrice: null } : draft)}
          />
        </View>
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 12 }}>
      <Text variant="headingSm" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

/** Three equal options in a row; the chosen one filled. They wrap under each other at large text sizes. */
function Options<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const theme = useTheme();
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              if (o.value !== value) haptics.select();
              onChange(o.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={o.label}
            style={({ pressed }) => ({
              flexGrow: 1,
              flexBasis: 0,
              minWidth: 96,
              minHeight: 48,
              borderRadius: 14,
              paddingHorizontal: 12,
              paddingVertical: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? theme.primaryFill : theme.surfaceMuted,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text
              variant="bodyMd"
              numberOfLines={2}
              style={{ textAlign: 'center', color: selected ? theme.primaryFillForeground : theme.muted }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
