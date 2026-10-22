import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import {
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewProps,
} from 'react-native';
import Animated, { useAnimatedScrollHandler, type SharedValue } from 'react-native-reanimated';

import { cn } from '@shared/utils/cn';

/**
 * Horizontally paged content, one page per width.
 *
 * Controlled: the active index lives with the caller, so a "Next" tap and a swipe
 * are the same state change rather than two sources that can disagree. The pager
 * scrolls itself when the index changes from outside, and reports the index when
 * the user swipes.
 *
 * `progress` is written on the UI thread with the live scroll position in pages
 * (2.4 = 40% of the way from page 2 to page 3), so anything outside the pager —
 * dots, a reveal — can track the swipe frame for frame instead of catching up
 * after it settles.
 *
 * Width is measured rather than taken from the window, so it also works inset.
 * Fills its parent's height unless given one.
 */

export type PagerProps<T> = Omit<ViewProps, 'children'> & {
  pages: readonly T[];
  keyOf: (page: T) => string;
  renderPage: (page: T, index: number, size: { width: number; height: number }) => ReactElement;
  index: number;
  onIndexChange: (index: number) => void;
  progress?: SharedValue<number>;
  height?: number;
  className?: string;
};

export function Pager<T>({
  pages,
  keyOf,
  renderPage,
  index,
  onIndexChange,
  progress,
  height,
  className,
  style,
  ...props
}: PagerProps<T>) {
  const listRef = useRef<Animated.FlatList<T>>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { width } = size;

  /**
   * The page the pager itself last settled on. Without this, the effect below
   * would scroll again in response to the index it just reported, fighting the
   * user's finger at the end of every swipe.
   */
  const settledIndex = useRef(index);

  // Runs on the UI thread, so whatever reads `progress` keeps up while JS is busy.
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (!progress || width === 0) return;
      // `.set()` rather than `.value =`: same write, but it does not read as
      // mutating a prop, which the React Compiler rule rejects.
      progress.set(event.contentOffset.x / width);
    },
  });

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    setSize((s) => (s.width === w && s.height === h ? s : { width: w, height: h }));
  }, []);

  useEffect(() => {
    if (width === 0 || settledIndex.current === index) return;
    settledIndex.current = index;
    listRef.current?.scrollToOffset({ offset: index * width, animated: true });
  }, [index, width]);

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (width === 0) return;
      const next = Math.round(e.nativeEvent.contentOffset.x / width);
      if (next === settledIndex.current) return;
      settledIndex.current = next;
      onIndexChange(next);
    },
    [onIndexChange, width],
  );

  // Stable reference so FlatList does not re-render every page on each parent render.
  const renderItem = useCallback(
    ({ item, index: i }: { item: T; index: number }) => (
      <View style={{ width: size.width, height: size.height }}>{renderPage(item, i, size)}</View>
    ),
    [renderPage, size],
  );

  return (
    <View
      onLayout={handleLayout}
      style={[height === undefined ? { flex: 1 } : { height }, style]}
      className={cn('w-full', className)}
      {...props}
    >
      {/* Rendering before the first layout would size every page to zero width. */}
      {width > 0 ? (
        <Animated.FlatList
          ref={listRef}
          data={pages}
          keyExtractor={keyOf}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          // Stop the rubber-band past the first and last page. Without this the
          // user can drag the strip clear of its bounds and see the background
          // through the gap.
          bounces={false}
          alwaysBounceHorizontal={false}
          overScrollMode="never"
          // A page is exactly one width, so there is nothing to decelerate into.
          decelerationRate="fast"
          onScroll={onScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={handleMomentumEnd}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          initialScrollIndex={index}
        />
      ) : null}
    </View>
  );
}
