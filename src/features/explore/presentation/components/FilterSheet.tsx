import { View } from 'react-native';

import { Chip, ChipGroup, Sheet, Text, Toggle } from '@shared/components';

import type { PostType } from '../../domain/entities/Explore';
import { PIN_TYPES } from '../../domain/rules/exploreRules';
import { exploreCopy } from '../copy';

/**
 * Behind the filter button beside the search: the same two filters as the
 * chips and the bolt (which type, and only today), in one place with words —
 * useful when large text pushes the chips off screen.
 */
export function FilterSheet({
  isPresented,
  type,
  todayOnly,
  onChangeType,
  onChangeToday,
  onDismiss,
}: {
  isPresented: boolean;
  type: PostType | null;
  todayOnly: boolean;
  onChangeType: (type: PostType | null) => void;
  onChangeToday: (on: boolean) => void;
  onDismiss: () => void;
}) {
  const copy = exploreCopy.filters;
  return (
    <Sheet isPresented={isPresented} title={copy.title} onDismiss={onDismiss}>
      <Text variant="labelSm" tone="muted">
        {copy.types}
      </Text>
      <View className="mt-8" accessibilityRole="radiogroup">
        <ChipGroup gap={8}>
          <Chip label={copy.all} role="radio" selected={type === null} onPress={() => onChangeType(null)} />
          {PIN_TYPES.map((t) => (
            <Chip
              key={t.type}
              label={t.label}
              role="radio"
              selected={type === t.type}
              onPress={() => onChangeType(t.type)}
            />
          ))}
        </ChipGroup>
      </View>
      <View className="mt-20" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
        <View style={{ flex: 1 }}>
          <Text variant="bodyMd">{copy.today}</Text>
          <Text variant="bodyXs" tone="muted">
            {copy.todayBody}
          </Text>
        </View>
        <Toggle value={todayOnly} onValueChange={onChangeToday} accessibilityLabel={copy.today} />
      </View>
    </Sheet>
  );
}
