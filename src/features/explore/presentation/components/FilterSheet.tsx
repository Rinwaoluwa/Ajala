import { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';

import { Button, CurrencyPicker, Host, NativeIcon, PillTabs, Sheet, Text, TextField, icons } from '@shared/components';
import { haptics } from '@shared/feedback/haptics';
import { useTheme } from '@shared/hooks/useTheme';
import { currencyInfo, currencyMark, formatAmount, pricePresets } from '@shared/money';
import { choosePreferredCurrency, useLocalCurrency, usePreferredCurrency } from '@shared/state/preferredCurrency';

import {
  NO_FILTERS,
  readMaxPrice,
  type DateFilter,
  type MapFilters,
  type PriceFilter,
} from '../../domain/rules/exploreRules';
import { exploreCopy } from '../copy';

/**
 * "Filters" (Figma): Date (any, today, this weekend) and Price (any, free,
 * paid), "Maximum price" in a currency, then Reset and Apply filters.
 *
 * The maximum is in the currency of where the person is ("Maximum price
 * (NGN)"). Switching currency is a Travel Pro feature (`canChooseCurrency`):
 * with it, the code sits beside the heading as a button that opens the currency
 * picker, and the sheet starts in the currency they last picked. The one-tap
 * amounts are round ones in whichever currency it is. Posts priced in another currency are left out by a maximum: the app
 * has no exchange rates to compare them with.
 *
 * The choices are a draft until Apply: closing the sheet keeps the map as it
 * was. Reset puts the draft back to no filters. The maximum is hidden with Free,
 * where it means nothing.
 *
 * The maximum is chosen, not typed (product, 12 Nov: the number pad covered the
 * field and had no way to close). One tap picks No limit or a common amount
 * (`pricePresets`); Custom opens the field, focused. The sheet then rises
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
  canChooseCurrency = false,
}: {
  isPresented: boolean;
  value: MapFilters;
  onApply: (filters: MapFilters) => void;
  onDismiss: () => void;
  /** Travel Pro: the maximum's currency can be changed. Without it, it is the currency of where the person is. */
  canChooseCurrency?: boolean;
}) {
  const copy = exploreCopy.filters;
  return (
    <Sheet isPresented={isPresented} title={copy.title} onDismiss={onDismiss}>
      {/* Mounted per opening, so the draft starts from what the map shows. */}
      {isPresented ? <FilterForm value={value} onApply={onApply} canChooseCurrency={canChooseCurrency} /> : null}
    </Sheet>
  );
}

function FilterForm({
  value,
  onApply,
  canChooseCurrency,
}: {
  value: MapFilters;
  onApply: (filters: MapFilters) => void;
  canChooseCurrency: boolean;
}) {
  const copy = exploreCopy.filters;
  const theme = useTheme();
  const [draft, setDraft] = useState<MapFilters>(value);
  // Remounting the uncontrolled field is how Reset empties it.
  const [maxKey, setMaxKey] = useState(0);
  // The currency the maximum is in: that of where the person is. With Travel Pro it is the one
  // applied last, else the one they last picked, and it can be changed here.
  const usual = usePreferredCurrency();
  const local = useLocalCurrency();
  const currency = canChooseCurrency ? (draft.currency ?? usual) : local;
  const presets = pricePresets(currency);
  const [choosingCurrency, setChoosingCurrency] = useState(false);

  // Typing a maximum of their own: opened by Custom, or a maximum that is not a preset.
  const [custom, setCustom] = useState(value.maxPrice !== null && !presets.includes(value.maxPrice));
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

  // Another currency: the amounts on offer change with it, so the maximum starts again.
  const chooseCurrency = (code: string) => {
    setChoosingCurrency(false);
    if (code === currency) return;
    setCustom(false);
    setMaxKey((k) => k + 1);
    setDraft((d) => ({ ...d, currency: code, maxPrice: null }));
    // Their usual currency from now on: the next post's price starts in it too.
    choosePreferredCurrency(code);
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
            {canChooseCurrency ? (
              // Wraps: at large text sizes the currency drops under the heading.
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                <Text variant="labelMd" style={{ flexShrink: 1 }}>
                  {copy.maxPriceHeading}
                </Text>
                {/* A plain style: a style function on a Pressable is dropped by the class-name interop. */}
                <TouchableOpacity
                  activeOpacity={0.6}
                  onPress={() => {
                    haptics.tap();
                    setChoosingCurrency(true);
                  }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={copy.changeCurrency(currencyInfo(currency).name)}
                  testID="filter-currency"
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.card,
                  }}
                >
                  <Text variant="labelSm">{currency}</Text>
                  <Host matchContents pointerEvents="none" ignoreSafeArea="all">
                    <NativeIcon source={icons.chevronDown} size={10} color={theme.muted} />
                  </Host>
                </TouchableOpacity>
              </View>
            ) : (
              // Switching currency is a Travel Pro feature: without it, the heading names the
              // currency of where the person is, as the design drew it.
              <Text variant="labelMd">{copy.maxPrice(currency)}</Text>
            )}
            <Options<MaxChoice>
              options={[
                { value: 'none', label: copy.noLimit },
                ...presets.map((n) => ({ value: `${n}` as MaxChoice, label: formatAmount(n, currency) })),
                { value: 'custom', label: copy.custom },
              ]}
              value={maxChoice}
              onChange={chooseMax}
            />
            {custom ? (
              <TextField
                key={`${currency}-${maxKey}`}
                label={copy.maxPrice(currency)}
                labelHidden
                placeholder={copy.customPlaceholder}
                defaultValue={draft.maxPrice !== null ? String(draft.maxPrice) : ''}
                keyboardType="number-pad"
                returnKeyType="done"
                maxLength={9}
                prefix={`${currencyMark(currency)} `}
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
            // The currency goes with the filters, so a maximum is always compared in the one shown.
            onPress={() => onApply({ ...draft, currency, maxPrice: draft.price === 'free' ? null : draft.maxPrice })}
          />
        </View>
      </View>
      {canChooseCurrency ? (
        <CurrencyPicker
          isPresented={choosingCurrency}
          value={currency}
          onChange={chooseCurrency}
          onDismiss={() => setChoosingCurrency(false)}
        />
      ) : null}
    </View>
  );
}

/** The maximum price choice: none, a preset (its amount as text), or typed. */
type MaxChoice = 'none' | 'custom' | `${number}`;

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
