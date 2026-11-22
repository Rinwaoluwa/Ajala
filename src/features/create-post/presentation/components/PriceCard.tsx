import { useCallback, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';

import { haptics } from '@shared/feedback/haptics';
import { CurrencyPicker, Host, NativeIcon, Text, TextField, icons } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { amountKeyboard, currencyInfo, currencyMark } from '@shared/money';
import { layout } from '@shared/theme';

import type { Currency } from '../../domain/entities/PostDraft';
import { wizardCopy } from '../copy';

/**
 * The price row: the currency beside the amount.
 *
 * With Travel Pro (`onCurrency` given) the currency is a button showing its
 * code ("NGN ▾") that opens the app's currency picker: any currency, the
 * person's usual ones first. Without it the code is simply shown, with nothing
 * to open: the price is in the currency of where they are. The amount is typed
 * with the keys that currency needs (digits alone for the yen, a decimal key
 * otherwise) behind its own mark ("₦", "CA$").
 *
 * There is no on/off switch: the price is optional, so a blank amount simply
 * means "no price", and the step's "Skip" clears it. The row wraps, so at large
 * text sizes the amount drops under the currency instead of being squeezed.
 */

export type PriceCardProps = {
  label: string;
  currency: Currency;
  /** Changes the currency (Travel Pro). Null: it is shown and cannot be changed. */
  onCurrency: ((currency: Currency) => void) | null;
  amount: string;
  onAmount: (text: string) => void;
  error?: string | null;
};

export function PriceCard({ label, currency, onCurrency, amount, onAmount, error }: PriceCardProps) {
  const theme = useTheme();
  const change = useCallback((text: string) => onAmount(text), [onAmount]);
  const [choosing, setChoosing] = useState(false);
  const info = currencyInfo(currency);
  // The amount field's height (the design's input height), so the two sit level; both grow
  // with the text size.
  const currencyBox = {
    minHeight: layout.input.height,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
  } as const;
  return (
    <View style={{ gap: 8 }}>
      <Text variant="labelXs" tone="muted">
        {label}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 12 }}>
        {onCurrency ? (
          // A plain style: a style function on a Pressable is dropped by the class-name interop.
          <TouchableOpacity
            activeOpacity={0.6}
            onPress={() => {
              haptics.tap();
              setChoosing(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={wizardCopy.changeCurrency(info.name)}
            testID="create-currency"
            style={currencyBox}
          >
            <Text variant="labelMd">{info.code}</Text>
            <Host matchContents pointerEvents="none" ignoreSafeArea="all">
              <NativeIcon source={icons.chevronDown} size={11} color={theme.muted} />
            </Host>
          </TouchableOpacity>
        ) : (
          // No choice to make: the same box, the code alone.
          <View
            accessible
            accessibilityLabel={wizardCopy.currencyIs(info.name)}
            testID="create-currency"
            style={currencyBox}
          >
            <Text variant="labelMd">{info.code}</Text>
          </View>
        )}
        <View style={{ flex: 1, minWidth: 140 }}>
          <TextField
            // The keys and the mark belong to the currency: a new one makes the field anew,
            // keeping what was typed.
            key={info.code}
            label={label}
            labelHidden
            placeholder={wizardCopy.amount}
            defaultValue={amount}
            onChangeText={change}
            keyboardType={amountKeyboard(info.code)}
            prefix={`${currencyMark(info.code)} `}
            maxLength={12}
            error={error}
            testID="create-price"
          />
        </View>
      </View>
      {onCurrency ? (
        <CurrencyPicker
          isPresented={choosing}
          value={info.code}
          onChange={(code) => {
            setChoosing(false);
            if (code !== info.code) onCurrency(code);
          }}
          onDismiss={() => setChoosing(false)}
        />
      ) : null}
    </View>
  );
}
