import { useState } from 'react';
import { View } from 'react-native';

import { Button, PillTabs, Sheet, Text, TextField } from '@shared/components';

import {
  FILTER_CURRENCY,
  MAX_PRICE_PRESETS,
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
 * The maximum is chosen, not typed (product, 12 Nov: the number pad covered the
 * field and had no way to close). One tap picks No limit or a common amount
 * (`MAX_PRICE_PRESETS`); Custom opens the field, focused. The sheet then rises
 * with the keyboard, so the field and Apply stay above it, and a tap anywhere
 * outside the field puts the number pad away.
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

  // Typing a maximum of their own: opened by Custom, or a maximum that is not a preset.
  const [custom, setCustom] = useState(
    value.maxPrice !== null && !(MAX_PRICE_PRESETS as readonly number[]).includes(value.maxPrice),
  );
  const maxChoice: MaxChoice = custom ? 'custom' : draft.maxPrice === null ? 'none' : `${draft.maxPrice}`;

  const reset = () => {
    setDraft(NO_FILTERS);
    setCustom(false);
    setMaxKey((k) => k + 1);
  };

  const chooseMax = (choice: MaxChoice) => {
    if (choice === 'custom') {
      setCustom(true);
      setDraft((d) => ({ ...d, maxPrice: null }));
      setMaxKey((k) => k + 1);
      return;
    }
    setCustom(false);
    setDraft((d) => ({ ...d, maxPrice: choice === 'none' ? null : Number(choice) }));
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
          <View style={{ marginTop: 16, gap: 12 }}>
            <Text variant="labelMd">{copy.maxPrice(FILTER_CURRENCY)}</Text>
            <Options<MaxChoice>
              options={[
                { value: 'none', label: copy.noLimit },
                ...MAX_PRICE_PRESETS.map((n) => ({ value: `${n}` as MaxChoice, label: naira(n) })),
                { value: 'custom', label: copy.custom },
              ]}
              value={maxChoice}
              onChange={chooseMax}
            />
            {custom ? (
              <TextField
                key={maxKey}
                label={copy.maxPrice(FILTER_CURRENCY)}
                labelHidden
                placeholder={copy.customPlaceholder}
                defaultValue={draft.maxPrice !== null ? String(draft.maxPrice) : ''}
                keyboardType="number-pad"
                returnKeyType="done"
                maxLength={9}
                prefix="₦ "
                autoFocus={maxKey > 0}
                clearable
                onChangeText={(text) => setDraft((d) => ({ ...d, maxPrice: readMaxPrice(text) }))}
              />
            ) : null}
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

/** The maximum price choice: none, a preset (its amount as text), or typed. */
type MaxChoice = 'none' | 'custom' | `${number}`;

/** "₦25,000". */
const naira = (n: number) => `₦${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

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

/**
 * A one-of choice as the app's own pills (`PillTabs`, as on the home feed and
 * Messages): the chosen one teal, Liquid Glass where the phone has it, every
 * pill in view (wrapping), each as wide as its label.
 *
 * Touch: the jelly wobble and the one light tap of haptics every pill in the
 * app has (`JellyPress`). That tap is the haptic: Apple's guidance is a single
 * light, consistent tap for choosing among options, so none is added on top.
 */
function Options<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return <PillTabs options={options} value={value} onChange={onChange} wrap role="radio" />;
}
