import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { haptics } from '@shared/feedback/haptics';

/**
 * Items in a grid that can be put in a new order by dragging: a post's photos
 * ("Drag to reorder. The first photo is the cover.") and the lines of a plan's
 * itinerary (one column).
 *
 * Press and hold a cell, then drag it; the others slide out of its way, and on
 * release it settles into the gap and `onMove(from, to)` reports the move. A
 * screen reader gets "Move earlier" / "Move later" actions on each cell instead.
 *
 * Cells are placed absolutely from their index, so a cell's width is worked out
 * from the measured container (`(width − gaps) ÷ columns`). Nothing wraps, so the
 * sub-pixel rounding that breaks a flex-wrap row of computed widths cannot move a
 * cell onto the next line. Height is `cellHeight` from the cell width (square
 * photos), or, without it, the tallest cell as measured — so rows grow with the
 * text-size setting.
 *
 * `footer` is one more cell after the items that never moves ("Add photo"), or
 * several (photos still uploading, then "Add photo"). `disabled` holds every
 * cell in place — while the list is being changed some other way.
 *
 * Motion: the held cell lifts to 104% and follows the finger; the others slide
 * 200ms ease-out to their new places, and the released cell glides into its
 * slot. Reduce Motion drops the lift and the slides — cells jump to their places.
 */

const SETTLE_MS = 200;
const HOLD_MS = 250;
const LIFT = 1.04;

export type SortableGridProps<T> = {
  items: readonly T[];
  keyOf: (item: T) => string;
  renderItem: (item: T, index: number) => ReactNode;
  onMove: (from: number, to: number) => void;
  columns: number;
  gap: number;
  /** Cell height for a given cell width; measured from the cells when left out. */
  cellHeight?: (cellWidth: number) => number;
  footer?: ReactNode | readonly ReactNode[];
  /** No dragging (and no move actions) while true. */
  disabled?: boolean;
  /** What a cell is, for "Move photo 2 earlier". */
  itemLabel?: (index: number) => string;
};

type Geometry = { cellWidth: number; cellHeight: number; columns: number; gap: number };

export function SortableGrid<T>({
  items,
  keyOf,
  renderItem,
  onMove,
  columns,
  gap,
  cellHeight,
  footer,
  disabled = false,
  itemLabel = (i) => `Item ${i + 1}`,
}: SortableGridProps<T>) {
  const fixed = (Array.isArray(footer) ? footer : [footer]).filter((f) => f != null && f !== false);
  const [width, setWidth] = useState(0);
  const [measured, setMeasured] = useState(0);
  const keys = items.map(keyOf);
  const keySignature = keys.join('|');

  // The live order while a drag is under way; reset whenever the items change.
  const order = useSharedValue<string[]>(keys);
  useEffect(() => {
    order.set(keySignature ? keySignature.split('|') : []);
  }, [keySignature, order]);

  const cellWidth = width > 0 ? (width - gap * (columns - 1)) / columns : 0;
  const rowHeight = cellHeight ? cellHeight(cellWidth) : measured;
  const geometry: Geometry = { cellWidth, cellHeight: rowHeight, columns, gap };
  const count = items.length + fixed.length;
  const rows = Math.ceil(count / columns);
  const height = rows > 0 && rowHeight > 0 ? rows * rowHeight + (rows - 1) * gap : 0;

  const onCellHeight = useCallback((h: number) => setMeasured((current) => (h > current ? h : current)), []);

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={{ height: cellHeight ? height : Math.max(height, measured) }}
    >
      {width > 0
        ? items.map((item, index) => {
            const key = keyOf(item);
            return (
              <SortableCell
                key={key}
                id={key}
                index={index}
                count={items.length}
                order={order}
                geometry={geometry}
                fixedHeight={!!cellHeight}
                onCellHeight={onCellHeight}
                onMove={onMove}
                disabled={disabled}
                label={itemLabel(index)}
              >
                {renderItem(item, index)}
              </SortableCell>
            );
          })
        : null}
      {width > 0
        ? fixed.map((cell, i) => (
            <View
              key={`fixed-${i}`}
              style={{
                position: 'absolute',
                width: cellWidth,
                height: rowHeight || undefined,
                ...offsetFor(items.length + i, geometry),
              }}
            >
              {cell}
            </View>
          ))
        : null}
    </View>
  );
}

function offsetFor(index: number, g: Geometry) {
  'worklet';
  const col = index % g.columns;
  const row = Math.floor(index / g.columns);
  return { left: col * (g.cellWidth + g.gap), top: row * (g.cellHeight + g.gap) };
}

function SortableCell({
  id,
  index,
  count,
  order,
  geometry,
  fixedHeight,
  onCellHeight,
  onMove,
  disabled,
  label,
  children,
}: {
  id: string;
  index: number;
  count: number;
  order: SharedValue<string[]>;
  geometry: Geometry;
  fixedHeight: boolean;
  onCellHeight: (h: number) => void;
  onMove: (from: number, to: number) => void;
  disabled: boolean;
  label: string;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const g = geometry;
  const home = offsetFor(index, g);
  // Where the cell is drawn. Follows the finger while held; otherwise slides to its slot.
  const x = useSharedValue(home.left);
  const y = useSharedValue(home.top);
  const dragging = useSharedValue(false);
  const startIndex = useSharedValue(index);
  const ease = { duration: reduceMotion ? 0 : SETTLE_MS, easing: Easing.out(Easing.quad) };

  // A neighbour's drag (or a new layout) moves this cell to its new slot.
  useAnimatedReaction(
    () => ({ at: order.value.indexOf(id), w: g.cellWidth, h: g.cellHeight }),
    (now, before) => {
      if (dragging.value || now.at < 0) return;
      const slot = offsetFor(now.at, g);
      // A changed size (rotation, text size) is a re-layout, not a move: no slide.
      const relayout = !before || before.w !== now.w || before.h !== now.h;
      x.set(relayout ? slot.left : withTiming(slot.left, ease));
      y.set(relayout ? slot.top : withTiming(slot.top, ease));
    },
  );

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .activateAfterLongPress(HOLD_MS)
    .onStart(() => {
      // Picked up: a firm bump, as the tile lifts.
      scheduleOnRN(haptics.impact);
      dragging.set(true);
      startIndex.set(order.value.indexOf(id));
    })
    .onUpdate((e) => {
      const start = offsetFor(startIndex.value, g);
      x.set(start.left + e.translationX);
      y.set(start.top + e.translationY);
      // The slot under the cell's centre.
      const cx = x.value + g.cellWidth / 2;
      const cy = y.value + g.cellHeight / 2;
      const col = Math.min(g.columns - 1, Math.max(0, Math.floor(cx / (g.cellWidth + g.gap))));
      const row = Math.max(0, Math.floor(cy / (g.cellHeight + g.gap)));
      const target = Math.min(count - 1, row * g.columns + col);
      const current = order.value.indexOf(id);
      if (target !== current && target >= 0) {
        const next = order.value.slice();
        next.splice(current, 1);
        next.splice(target, 0, id);
        order.set(next);
      }
    })
    .onFinalize(() => {
      if (!dragging.value) return;
      dragging.set(false);
      const from = startIndex.value;
      const to = order.value.indexOf(id);
      const slot = offsetFor(to, g);
      x.set(withTiming(slot.left, ease));
      y.set(withTiming(slot.top, ease));
      if (from !== to) scheduleOnRN(onMove, from, to);
    });

  const style = useAnimatedStyle(() => ({
    zIndex: dragging.value ? 10 : 0,
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: withTiming(dragging.value && !reduceMotion ? LIFT : 1, { duration: 150 }) },
    ],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        onLayout={fixedHeight ? undefined : (e) => onCellHeight(e.nativeEvent.layout.height)}
        accessibilityActions={disabled ? [] : [
          ...(index > 0 ? [{ name: 'moveEarlier', label: `Move ${label.toLowerCase()} earlier` }] : []),
          ...(index < count - 1 ? [{ name: 'moveLater', label: `Move ${label.toLowerCase()} later` }] : []),
        ]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'moveEarlier') onMove(index, index - 1);
          if (e.nativeEvent.actionName === 'moveLater') onMove(index, index + 1);
        }}
        style={[
          {
            position: 'absolute',
            left: 0,
            top: 0,
            width: g.cellWidth,
            height: fixedHeight ? g.cellHeight : undefined,
            // Until a measured row height is known, the cells would all sit on row one.
            opacity: g.cellHeight > 0 ? 1 : 0,
          },
          style,
        ]}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
