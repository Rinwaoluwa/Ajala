import { useMemo, useState, type ReactElement } from 'react';
import { ScrollView, View } from 'react-native';

import { useTheme } from '@shared/hooks/useTheme';

import { icons } from '../ui/icons';
import { NativeIcon } from '../ui/NativeIcon';
import { Text } from '../ui/Text';
import { TextField } from './TextField';

/**
 * A long list of choices as chips that fill the space they are given: every
 * chip listed, wrapping onto rows, in an area that scrolls up and down (never
 * sideways). A list long enough to need it gets a search field above it that
 * narrows the chips to the ones that match.
 *
 *   - Chosen chips come first, so what someone picked is in view straight away.
 *     The order is set when the chips first appear and when the search changes,
 *     not on every tap: a chip never jumps away from the finger that chose it.
 *   - The space is the parent's: give this a `flex: 1` home (the setup screens'
 *     `fill` mode), and it takes all of it.
 */
export type FittedChipsProps<T> = {
  items: readonly T[];
  keyOf: (item: T) => string;
  /** What search matches against. */
  labelOf: (item: T) => string;
  isSelected: (item: T) => boolean;
  renderChip: (item: T) => ReactElement;
  searchPlaceholder: string;
  noMatches: string;
  /** Lists this long or longer get the search field. */
  searchFrom?: number;
  gap?: number;
  rowGap?: number;
};

export function FittedChips<T>({
  items,
  keyOf,
  labelOf,
  isSelected,
  renderChip,
  searchPlaceholder,
  noMatches,
  searchFrom = 16,
  gap = 8,
  rowGap = 10,
}: FittedChipsProps<T>) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  // Which chips lead: the chosen ones, as of opening or the last change of search.
  const [pinned, setPinned] = useState(() => new Set(items.filter(isSelected).map(keyOf)));
  const search = (text: string) => {
    setQuery(text);
    setPinned(new Set(items.filter(isSelected).map(keyOf)));
  };

  const words = query.trim().toLowerCase();
  const shown = useMemo(() => {
    const matching = words ? items.filter((item) => labelOf(item).toLowerCase().includes(words)) : [...items];
    return [
      ...matching.filter((item) => pinned.has(keyOf(item))),
      ...matching.filter((item) => !pinned.has(keyOf(item))),
    ];
  }, [items, words, labelOf, keyOf, pinned]);

  return (
    <View style={{ flex: 1, gap: 12 }}>
      {items.length >= searchFrom ? (
        <TextField
          label={searchPlaceholder}
          labelHidden
          placeholder={searchPlaceholder}
          defaultValue={query}
          onChangeText={search}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearable
          leading={<NativeIcon source={icons.search} size={16} color={theme.muted} />}
        />
      ) : null}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 8 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {shown.length === 0 ? (
          <Text variant="bodySm" tone="muted">
            {noMatches}
          </Text>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: gap, rowGap }}>
            {shown.map((item) => (
              <View key={keyOf(item)}>{renderChip(item)}</View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
