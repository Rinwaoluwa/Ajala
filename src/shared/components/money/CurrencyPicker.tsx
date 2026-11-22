import { useMemo, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';

import { haptics } from '@shared/feedback/haptics';
import { useTheme } from '@shared/hooks/useTheme';
import { CURRENCIES, currencyInfo, deviceCurrency, searchCurrencies, type CurrencyInfo } from '@shared/money';
import { usePreferredCurrency } from '@shared/state/preferredCurrency';

import { TextField } from '../form/TextField';
import { Sheet } from '../overlay/Sheet';
import { Host } from '../ui/Host';
import { NativeIcon } from '../ui/NativeIcon';
import { Text } from '../ui/Text';
import { icons } from '../ui/icons';

/**
 * Choosing a currency, the same everywhere one is chosen (a post's price,
 * Explore's "Maximum price"): a sheet with a search field over the list.
 *
 * The likely ones come first, under "Suggested": the one chosen now, the one
 * this person last used, the phone's own, then the app's main currencies. The
 * rest follow in code order. Typing narrows by code, name or mark ("naira",
 * "ngn", "₦").
 *
 * Each row is the mark, the name and the code; the chosen one has a tick.
 * Choosing closes the sheet. It does not remember the choice itself: the caller
 * decides whether a pick here becomes the person's usual currency.
 */

export type CurrencyPickerProps = {
  isPresented: boolean;
  /** The currency chosen now (ISO code). */
  value: string;
  onChange: (code: string) => void;
  onDismiss: () => void;
  title?: string;
};

/** The app's main currencies, after the person's own. */
const COMMON = ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR', 'CAD'] as const;
const SUGGESTED_MAX = 6;

export const currencyPickerCopy = {
  title: 'Currency',
  search: 'Search currencies',
  suggested: 'Suggested',
  all: 'All currencies',
  none: (query: string) => `No currency matches "${query}".`,
};

export function CurrencyPicker({ isPresented, value, onChange, onDismiss, title }: CurrencyPickerProps) {
  const theme = useTheme();
  const preferred = usePreferredCurrency();
  const [query, setQuery] = useState('');
  // Each opening starts with an empty search: the field is made anew (it keeps its own text).
  const [opened, setOpened] = useState(isPresented);
  const [opening, setOpening] = useState(0);
  if (isPresented !== opened) {
    setOpened(isPresented);
    if (isPresented) {
      setOpening((n) => n + 1);
      setQuery('');
    }
  }

  const suggested = useMemo(() => {
    const codes = [...new Set([value.toUpperCase(), preferred, deviceCurrency(), ...COMMON])];
    return codes.slice(0, SUGGESTED_MAX).map(currencyInfo);
  }, [value, preferred]);
  const found = useMemo(() => searchCurrencies(query), [query]);
  const searching = query.trim() !== '';

  const row = (currency: CurrencyInfo, key: string) => {
    const selected = currency.code === value.toUpperCase();
    return (
      // A plain style: a style function on a Pressable is dropped by the class-name interop.
      <TouchableOpacity
        key={key}
        activeOpacity={0.6}
        onPress={() => {
          if (!selected) haptics.select();
          onChange(currency.code);
        }}
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        accessibilityLabel={`${currency.name}, ${currency.code}`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 48 }}
      >
        {/* The mark, in a column of its own so the names line up whatever its width. */}
        <View style={{ width: 52 }}>
          <Text variant="labelMd" numberOfLines={1} style={{ color: theme.primary }}>
            {currency.symbol}
          </Text>
        </View>
        <Text variant="bodyMd" style={{ flex: 1 }}>
          {currency.name}
        </Text>
        <Text variant="bodySm" tone="muted">
          {currency.code}
        </Text>
        <View style={{ width: 18, alignItems: 'flex-end' }}>
          {selected ? (
            <Host matchContents pointerEvents="none" ignoreSafeArea="all">
              <NativeIcon source={icons.check} size={14} color={theme.primary} />
            </Host>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const heading = (text: string, first = false) => (
    <Text
      variant="labelXs"
      tone="muted"
      style={{ marginTop: first ? 0 : 12, marginBottom: 2 }}
      accessibilityRole="header"
    >
      {text}
    </Text>
  );

  return (
    <Sheet
      isPresented={isPresented}
      title={title ?? currencyPickerCopy.title}
      onDismiss={onDismiss}
      // The search field stays put over the list.
      header={
        <TextField
          key={opening}
          label={currencyPickerCopy.search}
          labelHidden
          filled
          placeholder={currencyPickerCopy.search}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearable
          leading={<NativeIcon source={icons.search} size={16} color={theme.muted} />}
          testID="currency-search"
        />
      }
    >
      <View accessibilityRole="radiogroup" style={{ paddingBottom: 8 }}>
        {searching ? (
          found.length ? (
            found.map((c) => row(c, c.code))
          ) : (
            <Text
              variant="bodySm"
              tone="muted"
              style={{ marginVertical: 24, textAlign: 'center' }}
              accessibilityLiveRegion="polite"
            >
              {currencyPickerCopy.none(query.trim())}
            </Text>
          )
        ) : (
          <>
            {heading(currencyPickerCopy.suggested, true)}
            {suggested.map((c) => row(c, `suggested-${c.code}`))}
            {heading(currencyPickerCopy.all)}
            {CURRENCIES.map((c) => row(c, c.code))}
          </>
        )}
      </View>
    </Sheet>
  );
}
