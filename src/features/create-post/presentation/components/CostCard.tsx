import { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { Text, TextField } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { palette } from '@shared/theme';

import type { Currency } from '../../domain/entities/PostDraft';
import { wizardCopy } from '../copy';
import { SettingsCard, ToggleRow } from './ToggleRow';

/**
 * The cost card (Figma Cost Sharing): the toggle row, and when it is on, the
 * currency (NGN | USD) beside the amount. The lower half opens with a fade while
 * the card grows (200ms); off, it folds away.
 */

const CURRENCIES: readonly Currency[] = ['NGN', 'USD'];

export type CostCardProps = {
  title: string;
  body: string;
  on: boolean;
  onToggle: (on: boolean) => void;
  currency: Currency;
  onCurrency: (currency: Currency) => void;
  amount: string;
  onAmount: (text: string) => void;
  error?: string | null;
};

export function CostCard({
  title,
  body,
  on,
  onToggle,
  currency,
  onCurrency,
  amount,
  onAmount,
  error,
}: CostCardProps) {
  const theme = useTheme();
  return (
    <Animated.View layout={LinearTransition.duration(200)}>
      <SettingsCard>
        <ToggleRow title={title} body={body} value={on} onChange={onToggle} testID="create-cost-toggle" />
        {on ? (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(120)}
            style={{
              borderTopWidth: 1,
              borderTopColor: theme.border,
              backgroundColor: theme.surfaceMuted,
              padding: 16,
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <CurrencyPills value={currency} onChange={onCurrency} />
            <View style={{ flex: 1, minWidth: 140 }}>
              <AmountField amount={amount} onAmount={onAmount} error={error} />
            </View>
          </Animated.View>
        ) : null}
      </SettingsCard>
    </Animated.View>
  );
}

function AmountField({
  amount,
  onAmount,
  error,
}: {
  amount: string;
  onAmount: (text: string) => void;
  error?: string | null;
}) {
  const change = useCallback((text: string) => onAmount(text), [onAmount]);
  return (
    <TextField
      label={wizardCopy.amount}
      labelHidden
      placeholder={wizardCopy.amount}
      defaultValue={amount}
      onChangeText={change}
      keyboardType="number-pad"
      maxLength={9}
      error={error}
      testID="create-amount"
    />
  );
}

function CurrencyPills({ value, onChange }: { value: Currency; onChange: (c: Currency) => void }) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
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
            onPress={() => onChange(c)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
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
