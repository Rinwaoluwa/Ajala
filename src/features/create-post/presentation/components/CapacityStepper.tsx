import { useEffect, useRef, useState } from 'react';
import { TextInput, TouchableOpacity, View } from 'react-native';

import { haptics } from '@shared/feedback/haptics';
import { Host, NativeIcon, Text, icons } from '@shared/components';
import { MAX_TEXT_SCALE } from '@shared/hooks/useFontScale';
import { useTheme } from '@shared/hooks/useTheme';
import { textStyles } from '@shared/theme';

import { wizardCopy } from '../copy';

/**
 * "Capacity: − 10 + people" (Figma Participants): round − and + either side of
 * the number in a pale card. Holding a button repeats it, faster after a moment,
 * so 150 is a hold rather than 140 taps. Null reads "No limit".
 *
 * The number is also a field: tap it and type. What is typed counts as it is
 * typed (`onType`), and is put back in range when the field is left
 * (`onCommit`), so 0 becomes the smallest allowed and blank is "No limit" where
 * the kind allows one.
 */

const REPEAT_FIRST_MS = 350;
const REPEAT_MS = 70;

export type CapacityStepperProps = {
  label: string;
  value: number | null;
  onStep: (delta: 1 | -1) => void;
  /** Each keystroke: the whole number typed, or null when blank. */
  onType: (value: number | null) => void;
  /** The field was left: put the value back in range. */
  onCommit: () => void;
  hint?: string | null;
};

export function CapacityStepper({ label, value, onStep, onType, onCommit, hint }: CapacityStepperProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  // While typing, the field shows exactly what was typed (blank included), until
  // − or + changes the number underneath it.
  const [typed, setTyped] = useState('');
  const typedValue = typed ? Number(typed) : null;
  const shown = focused && typedValue === value ? typed : value === null ? '' : String(value);

  return (
    <View>
      <Text variant="labelXs" tone="muted">
        {label}
      </Text>
      <View
        style={{
          marginTop: 8,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.surfaceMuted,
        }}
      >
        <StepButton icon="minus" label={wizardCopy.fewerPeople} onStep={() => onStep(-1)} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <TextInput
            value={shown}
            placeholder={wizardCopy.noLimit}
            placeholderTextColor={theme.muted}
            onFocus={() => {
              setTyped(value === null ? '' : String(value));
              setFocused(true);
            }}
            onChangeText={(text) => {
              const digits = text.replace(/\D/g, '');
              setTyped(digits);
              onType(digits ? Number(digits) : null);
            }}
            onBlur={() => {
              setFocused(false);
              onCommit();
            }}
            keyboardType="number-pad"
            returnKeyType="done"
            maxLength={6}
            selectTextOnFocus
            accessibilityLabel={label}
            accessibilityHint={wizardCopy.typeCapacity}
            maxFontSizeMultiplier={MAX_TEXT_SCALE}
            testID="create-capacity"
            style={{
              alignSelf: 'stretch',
              textAlign: 'center',
              paddingVertical: 0,
              color: theme.foreground,
              fontFamily: textStyles.headingLg.fontFamily,
              fontSize: value === null && !focused ? textStyles.headingSm.fontSize : textStyles.headingLg.fontSize,
              lineHeight: textStyles.headingLg.lineHeight,
            }}
          />
        </View>
        <StepButton icon="plus" label={wizardCopy.morePeople} onStep={() => onStep(1)} />
        <Text variant="bodyMd" tone="muted" importantForAccessibility="no" maxFontSizeMultiplier={1.5}>
          {wizardCopy.people}
        </Text>
      </View>
      {hint ? (
        <Text variant="bodyXs" tone="muted" className="mt-6">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

function StepButton({ icon, label, onStep }: { icon: 'minus' | 'plus'; label: string; onStep: () => void }) {
  const theme = useTheme();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The latest step, so a held button keeps counting from the current number
  // rather than the one it was pressed on.
  const latest = useRef(onStep);
  useEffect(() => {
    latest.current = onStep;
  }, [onStep]);
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);

  const repeat = (delay: number) => {
    timer.current = setTimeout(() => {
      haptics.select();
      latest.current();
      repeat(REPEAT_MS);
    }, delay);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={() => {
        haptics.select();
        onStep();
      }}
      onLongPress={() => repeat(0)}
      delayLongPress={REPEAT_FIRST_MS}
      onPressOut={stop}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.selectedFill,
        backgroundColor: theme.card,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Host matchContents pointerEvents="none" ignoreSafeArea="all">
        <NativeIcon source={icon === 'minus' ? icons.minus : icons.add} size={16} color={theme.primary} />
      </Host>
    </TouchableOpacity>
  );
}
