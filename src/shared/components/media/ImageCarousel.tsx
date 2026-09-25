import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  type ImageSourcePropType,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewProps,
} from 'react-native';
import Animated, { useAnimatedScrollHandler, type SharedValue } from 'react-native-reanimated';

import { cn } from '@shared/utils/cn';

/**
 * Horizontally paged images.
 *
 * Only the images move — whatever sits around the carousel stays put.
 *
 * Controlled: the active index lives with the caller, so a "Next" tap and a swipe
 * are the same state change rather than two sources that can disagree. The carousel
 * scrolls itself when the index changes from outside, and reports the index when the
 * user swipes.
 *
 * Width is measured rather than taken from the window, so it also works inset.
 */

export type CarouselImage = {
  /** Stable identity for the list. */
  key: string;
  source: ImageSourcePropType | undefined;
  /** Describe the picture, or omit when it is decorative. */
  accessibilityLabel?: string;
};

export type ImageCarouselProps = Omit<ViewProps, 'children'> & {
  images: CarouselImage[];
  index: number;
  onIndexChange: (index: number) => void;
  height: number;
  /**
   * Written with the live scroll position in pages (2.4 = 40% from page 2 to 3).
   * Pass the same value to `PaginationDots` so the indicator tracks the image
   * frame-for-frame instead of catching up after the swipe settles.
   */
  progress?: SharedValue<number>;
  className?: string;
};

const AnimatedFlatList = Animated.FlatList<CarouselImage>;

export function ImageCarousel({
  images,
  index,
  onIndexChange,
  height,
  progress,
  className,
  ...props
}: ImageCarouselProps) {
  const listRef = useRef<Animated.FlatList<CarouselImage>>(null);
  const [width, setWidth] = useState(0);

  /**
   * The page the carousel itself last settled on. Without this, the effect below
   * would scroll again in response to the index it just reported, fighting the
   * user's finger at the end of every swipe.
   */
  const settledIndex = useRef(index);

  // Runs on the UI thread, so the dots keep up even while JS is busy.
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (!progress || width === 0) return;
      // `.set()` rather than `.value =`: same write, but it does not read as
      // mutating a prop, which the React Compiler rule rejects.
      progress.set(event.contentOffset.x / width);
    },
  });

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
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
    ({ item }: { item: CarouselImage }) => (
      <View style={{ width, height }}>
        {item.source ? (
          <Image
            source={item.source}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={0}
            accessibilityLabel={item.accessibilityLabel}
            accessible={Boolean(item.accessibilityLabel)}
          />
        ) : null}
      </View>
    ),
    [height, width],
  );

  return (
    <View onLayout={handleLayout} style={{ height }} className={cn('w-full', className)} {...props}>
      {/* Rendering before the first layout would size every page to zero width. */}
      {width > 0 ? (
        <AnimatedFlatList
          ref={listRef}
          data={images}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          // Stop the rubber-band past the first and last page. Without this the
          // user can drag the strip clear of its bounds and see the page
          // background through the gap, which reads as the image overflowing.
          bounces={false}
          alwaysBounceHorizontal={false}
          overScrollMode="never"
          // A page is exactly one screen, so there is nothing to decelerate into.
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
