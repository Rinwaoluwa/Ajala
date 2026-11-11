import { useCallback } from 'react';
import { Pressable, View } from 'react-native';

import { haptics } from '@shared/feedback/haptics';
import { Text, TextField } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { layout, palette } from '@shared/theme';

import type { Currency } from '../../domain/entities/PostDraft';
import { wizardCopy } from '../copy';

/**
 * The price row: the currency (NGN | USD) beside the amount. There is no on/off
 * switch any more: the price is optional, so a blank amount simply means "no
 * price", and the step's "Skip" clears it. The row wraps, so at large text sizes
 * the amount drops under the currency instead of being squeezed.
 */

const CURRENCIES: readonly Currency[] = ['NGN', 'USD'];

export type PriceCardProps = {
  label: string;
  currency: Currency;
  onCurrency: (currency: Currency) => void;
  amount: string;
  onAmount: (text: string) => void;
  error?: string | null;
};

export function PriceCard({ label, currency, onCurrency, amount, onAmount, error }: PriceCardProps) {
  const change = useCallback((text: string) => onAmount(text), [onAmount]);
  return (
    <View style={{ gap: 8 }}>
      <Text variant="labelXs" tone="muted">
        {label}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 12 }}>
        <CurrencyPills value={currency} onChange={onCurrency} />
        <View style={{ flex: 1, minWidth: 140 }}>
          <TextField
            label={label}
            labelHidden
            placeholder={wizardCopy.amount}
            defaultValue={amount}
            onChangeText={change}
            keyboardType="number-pad"
            maxLength={9}
            error={error}
            testID="create-price"
          />
        </View>
      </View>
    </View>
  );
}

function CurrencyPills({ value, onChange }: { value: Currency; onChange: (c: Currency) => void }) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={wizardCopy.currency}
      style={{
        flexDirection: 'row',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.card,
        overflow: 'hidden',
      }}
    >
      {CURRENCIES.map((c) => {
        const selected = c === value;
        return (
          <Pressable
            key={c}
            onPress={() => {
              if (c !== value) haptics.select();
              onChange(c);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            // The amount field's height (the design's input height, inside this border),
            // so the two sit level; both grow with the text size.
            style={{
              minHeight: layout.input.height - 2,
              justifyContent: 'center',
              paddingHorizontal: 16,
              backgroundColor: selected ? theme.primaryFill : 'transparent',
            }}
          >
            <Text variant="labelMd" style={{ color: selected ? palette.white : theme.foreground }}>
              {c}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
