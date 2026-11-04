import { Host } from '@expo/ui';
import { useEffect, useRef } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { NativeIcon, Text, icons } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

import { wizardCopy } from '../copy';

/**
 * "Capacity: − 10 + people" (Figma Participants): round − and + either side of
 * the number in a pale card. Holding a button repeats it, faster after a moment,
 * so 150 is a hold rather than 140 taps. Null reads "No limit".
 *
 * For a screen reader the number is one adjustable element: swipe up or down.
 * The number fades as it changes (120ms).
 */

const REPEAT_FIRST_MS = 350;
const REPEAT_MS = 70;

export type CapacityStepperProps = {
  label: string;
  value: number | null;
  onStep: (delta: 1 | -1) => void;
  hint?: string | null;
};

export function CapacityStepper({ label, value, onStep, hint }: CapacityStepperProps) {
  const theme = useTheme();
  const shown = value === null ? wizardCopy.noLimit : String(value);

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
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ text: value === null ? wizardCopy.noLimit : `${value} ${wizardCopy.people}` }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => onStep(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
          style={{ flex: 1, alignItems: 'center' }}
        >
          {/* One line that shrinks to fit: at large text "No limit" must not break mid-word. */}
          <Animated.View key={shown} entering={FadeIn.duration(120)} style={{ maxWidth: '100%' }}>
            <Text
              variant={value === null ? 'headingSm' : 'headingLg'}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {shown}
            </Text>
          </Animated.View>
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
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);

  const repeat = (delay: number) => {
    timer.current = setTimeout(() => {
      onStep();
      repeat(REPEAT_MS);
    }, delay);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={onStep}
      onLongPress={() => repeat(0)}
      delayLongPress={REPEAT_FIRST_MS}
      onPressOut={stop}
      accessibilityRole="button"
      accessibilityLabel={label}
      importantForAccessibility="no-hide-descendants"
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
