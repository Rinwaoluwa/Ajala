import { useState, type ReactElement } from 'react';
import { ScrollView, View, type LayoutChangeEvent } from 'react-native';

/**
 * Pills on one line while they fit, then in `maxRows` rows that scroll sideways
 * together (interests, languages, travel styles, places — on profiles, in Edit
 * profile, in setup and the create wizard).
 *
 *   - Everything fits across the screen: one row, nothing scrolls.
 *   - It does not: the pills are split into `maxRows` rows, in order (left to
 *     right, then down), each about the same length. The rows sit in a
 *     horizontal scroll view, which only scrolls when they are still wider
 *     than the screen.
 *
 * Every pill reports its width, in either layout. The group is hidden only for
 * its very first frame, before anything is measured. After that it keeps its
 * layout while a newly added pill is measured (its width counts as nothing for
 * that frame), so picking a chip never makes the group blink or jump.
 */
export type PillRowsProps = {
  pills: ReactElement[];
  maxRows?: number;
  gap?: number;
  rowGap?: number;
};

type Mode = 'unknown' | 'line' | 'rows';

/**
 * Splits widths, in order, into at most `rows` runs of about equal length.
 * Returns the index each run starts at.
 */
export function splitIntoRows(widths: number[], rows: number, gap: number): number[] {
  const count = Math.min(rows, widths.length);
  if (count <= 1) return [0];
  const total = widths.reduce((sum, w) => sum + w, 0) + gap * (widths.length - 1);
  const target = total / count;
  const starts = [0];
  let line = 0;
  widths.forEach((w, i) => {
    const left = widths.length - i;
    const rowsLeft = count - starts.length;
    const longer = line === 0 ? w : line + gap + w;
    // Start a new row when this pill takes the row further past the target than
    // stopping short of it would, or when every remaining row needs a pill.
    const breakHere =
      i > 0 && line > 0 && rowsLeft > 0 && (longer - target > target - line || left === rowsLeft);
    if (breakHere) {
      starts.push(i);
      line = w;
    } else line = longer;
  });
  return starts;
}

export function PillRows({ pills, maxRows = 3, gap = 8, rowGap = 8 }: PillRowsProps) {
  const [space, setSpace] = useState(0);
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [mode, setMode] = useState<Mode>('unknown');
  const keys = pills.map((p, i) => String(p.key ?? i));
  const allMeasured = space > 0 && keys.every((k) => widths[k] !== undefined);
  const measured = keys.map((k) => widths[k] ?? 0);

  // The length of one line of every pill.
  const oneLine = measured.reduce((sum, w) => sum + w, 0) + gap * Math.max(0, keys.length - 1);
  const wanted: Mode = allMeasured ? (oneLine > space + 1 ? 'rows' : 'line') : mode;
  if (wanted !== mode) setMode(wanted);

  const onPill = (key: string) => (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setWidths((prev) => (prev[key] === w ? prev : { ...prev, [key]: w }));
  };
  const measuredPill = (pill: ReactElement, key: string) => (
    <View key={key} onLayout={onPill(key)}>
      {pill}
    </View>
  );

  let body: ReactElement;
  if (wanted === 'rows') {
    const starts = splitIntoRows(measured, maxRows, gap);
    const rows = starts.map((from, r) => pills.slice(from, starts[r + 1] ?? pills.length).map((pill, j) => measuredPill(pill, keys[from + j]!)));
    body = (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={{ gap: rowGap }}>
          {rows.map((row, r) => (
            <View key={r} style={{ flexDirection: 'row', gap }}>
              {row}
            </View>
          ))}
        </View>
      </ScrollView>
    );
  } else {
    // One line. Before the first measure, wrapping keeps a long list from
    // stretching the page for its one hidden frame.
    body = (
      <View style={{ flexDirection: 'row', flexWrap: wanted === 'unknown' ? 'wrap' : 'nowrap', columnGap: gap, rowGap }}>
        {pills.map((pill, i) => measuredPill(pill, keys[i]!))}
      </View>
    );
  }

  return (
    <View
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        setSpace((s) => (s === w ? s : w));
      }}
      style={{ opacity: wanted === 'unknown' ? 0 : 1 }}
    >
      {body}
    </View>
  );
}
