import { useState, type ReactElement, type ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
// The gesture library's scroll view keeps its own swipe (see `ScrollRow`).
import { ScrollView } from 'react-native-gesture-handler';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { splitIntoRows } from './splitIntoRows';

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
 *
 * That first frame is not always one frame. A long list of chips (the create
 * wizard's interests) is drawn twice, once to be measured and once in its rows,
 * and on a slow phone that left a blank gap of a second or more, with whatever
 * came after the group pushed down the page by the hidden, wrapped list. With a
 * `placeholder` the gap shows that instead (a loader), and the pills are
 * measured out of the way, taking no room; they then fade in over it. `loading`
 * keeps the placeholder up while the list itself is still on its way, so one
 * loader covers the wait for the list and the wait to lay it out.
 */
export type PillRowsProps = {
  pills: ReactElement[];
  maxRows?: number;
  gap?: number;
  rowGap?: number;
  /** Shown in the group's place until its pills can be shown (see above). */
  placeholder?: ReactNode;
  /** The pills are not here yet: keep the `placeholder` up. */
  loading?: boolean;
};

type Mode = 'unknown' | 'line' | 'rows';

export function PillRows({ pills, maxRows = 3, gap = 8, rowGap = 8, placeholder, loading = false }: PillRowsProps) {
  const [space, setSpace] = useState(0);
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [mode, setMode] = useState<Mode>('unknown');
  const keys = pills.map((p, i) => String(p.key ?? i));
  // With no pills there is nothing to measure and no layout to settle on: a group that is
  // still waiting for its list must not decide it is "one line" and then show the list
  // that way for the frame it takes to measure it.
  const allMeasured = space > 0 && keys.length > 0 && keys.every((k) => widths[k] !== undefined);
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

  const onSpace = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setSpace((s) => (s === w ? s : w));
  };

  if (placeholder == null) {
    return (
      <View onLayout={onSpace} style={{ opacity: wanted === 'unknown' ? 0 : 1 }}>
        {body}
      </View>
    );
  }

  // With a placeholder: it holds the group's place until the pills are here and measured.
  // Meanwhile they are measured over it, unseen and taking no room, so nothing below moves
  // for a list nobody can see yet.
  const waiting = loading || wanted === 'unknown';
  return (
    <View onLayout={onSpace}>
      {waiting ? (
        <>
          {placeholder}
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, opacity: 0 }}
          >
            {body}
          </View>
        </>
      ) : (
        <Animated.View entering={FadeIn.duration(180).reduceMotion(ReduceMotion.System)}>{body}</Animated.View>
      )}
    </View>
  );
}
