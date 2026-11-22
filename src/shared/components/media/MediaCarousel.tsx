import { Image } from 'expo-image';
import { memo, useMemo, useRef } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { useTheme } from '@shared/hooks/useTheme';

/**
 * A post's photos in the feed: a strip that scrolls sideways, edge to edge,
 * with small pills above it saying which photo is in front. Built from a
 * frame-by-frame study of a reference recording (docs/design/feed-post-motion.md).
 *
 *   - Each photo is 70% of the screen wide (1.18 : 1), so the next one always
 *     peeks in. The first lines up with the post's text (`gutter`); the last
 *     rests on the trailing gutter with the one before it showing.
 *   - It is the platform's own scroller with a resting place per photo
 *     (`snapToOffsets`), one photo per swipe. So the feel under the finger, the
 *     settle, and the rubber band at either end (iOS's bounce, Android's
 *     stretch) are the system's, not an imitation.
 *   - The pills follow the scroll itself, on the UI thread: the front photo's
 *     pill is twice as long and darker, and width and colour blend by how far
 *     the strip is between two resting places. They hold still past the ends.
 *   - One photo alone fills the text column: no strip, no pills.
 *
 * Tapping a photo hands back which one and where it is on screen (`onOpen`),
 * so the viewer can grow it from its place.
 */

/** Where a tapped photo sits in the window, for the viewer's opening. */
export type MediaFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  /** The photo's own width ÷ height, once it has loaded; null before. */
  aspect: number | null;
};

export type MediaCarouselProps = {
  /** Card-size photo URLs, in order. */
  images: readonly string[];
  /** The post's side margin: where the first photo starts and the last one stops. */
  gutter: number;
  onOpen: (index: number, from: MediaFrame) => void;
  /** Said for each photo: "Sunset walk, photo 2 of 3". */
  label?: string;
};

/** A photo's share of the screen's width, and its shape (the recording's: 277.5 of 414, 555 : 470). */
const WIDTH_SHARE = 0.7;
const ASPECT = 1.18;
/** One photo alone: the text column's width, a little wider than tall. */
const SINGLE_ASPECT = 1.5;
const GAP = 6;
const RADIUS = 14;

const PILL_HEIGHT = 4;
const PILL = 11;
const PILL_GAP = 6;

function MediaCarouselComponent({ images, gutter, onOpen, label }: MediaCarouselProps) {
  const { width: screen } = useWindowDimensions();
  const count = images.length;
  const x = useSharedValue(0);

  const itemWidth = Math.round(screen * WIDTH_SHARE);
  const itemHeight = Math.round(itemWidth / ASPECT);

  // Where the strip rests for each photo: its own left edge on the gutter, except that the
  // strip cannot scroll past its end, so the last photo rests on the trailing gutter.
  const offsets = useMemo(() => {
    const content = count * itemWidth + (count - 1) * GAP + gutter * 2;
    const end = Math.max(0, content - screen);
    const out: number[] = [];
    for (let i = 0; i < count; i += 1) {
      const at = Math.min(i * (itemWidth + GAP), end);
      // Strictly rising, so the pills' blend never divides by zero.
      out.push(i > 0 && at <= out[i - 1] ? out[i - 1] + 1 : at);
    }
    return out;
  }, [count, itemWidth, gutter, screen]);

  const onScroll = useAnimatedScrollHandler((e) => {
    x.set(e.contentOffset.x);
  });

  // Which photo is in front, in photos: 0, 0.4, 1 … Held at the ends, so a pull past
  // the first or last photo leaves the pills alone.
  const progress = useDerivedValue(() =>
    offsets.length > 1
      ? interpolate(
          x.value,
          offsets,
          offsets.map((_, i) => i),
          Extrapolation.CLAMP,
        )
      : 0,
  );

  if (count === 0) return null;
  if (count === 1) {
    // Sized by the column, not by sums of measured widths.
    return (
      <Tile
        uri={images[0]}
        index={0}
        count={1}
        label={label}
        onOpen={onOpen}
        style={{ marginHorizontal: gutter, aspectRatio: SINGLE_ASPECT }}
      />
    );
  }

  return (
    <View>
      <CarouselIndicator count={count} progress={progress} style={{ marginLeft: gutter, marginBottom: 10 }} />
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        snapToOffsets={offsets}
        decelerationRate="fast"
        // One photo per swipe, however hard the flick.
        disableIntervalMomentum
        contentContainerStyle={{ paddingHorizontal: gutter, gap: GAP }}
      >
        {images.map((uri, i) => (
          <Tile
            key={uri}
            uri={uri}
            index={i}
            count={count}
            label={label}
            onOpen={onOpen}
            style={{ width: itemWidth, height: itemHeight }}
          />
        ))}
      </Animated.ScrollView>
    </View>
  );
}

/**
 * One photo. A tap reports where it is in the window and its own shape (learnt
 * as it loads), so the viewer can open by growing it from there.
 */
function Tile({
  uri,
  index,
  count,
  label,
  onOpen,
  style,
}: {
  uri: string;
  index: number;
  count: number;
  label?: string;
  onOpen: MediaCarouselProps['onOpen'];
  style: object;
}) {
  const theme = useTheme();
  const tile = useRef<View>(null);
  const aspect = useRef<number | null>(null);
  const open = () => {
    const from = (x: number, y: number, width: number, height: number) =>
      onOpen(index, { x, y, width, height, radius: RADIUS, aspect: aspect.current });
    if (tile.current) tile.current.measureInWindow(from);
    else from(0, 0, 0, 0);
  };
  return (
    <Pressable
      ref={tile}
      // Measured where it is on screen: it must not be flattened out of the view tree.
      collapsable={false}
      onPress={open}
      accessibilityRole="imagebutton"
      accessibilityLabel={
        label ? (count > 1 ? `${label}, photo ${index + 1} of ${count}` : `${label}, photo`) : undefined
      }
      style={[{ borderRadius: RADIUS, overflow: 'hidden', backgroundColor: theme.skeleton }, style]}
    >
      <Image
        source={{ uri }}
        style={{ flex: 1 }}
        contentFit="cover"
        transition={200}
        recyclingKey={uri}
        onLoad={(e) => {
          const { width, height } = e.source;
          if (width > 0 && height > 0) aspect.current = width / height;
        }}
      />
    </Pressable>
  );
}

/** Memoised: a feed redraws often, and a strip only changes with its photos. */
export const MediaCarousel = memo(MediaCarouselComponent);

/**
 * The pills over a photo strip: one per photo, the front one twice as long and
 * darker. `progress` is the live position in photos (0 … count − 1), so the
 * pills move with the finger rather than after it.
 */
export function CarouselIndicator({
  count,
  progress,
  style,
}: {
  count: number;
  progress: SharedValue<number>;
  style?: object;
}) {
  return (
    <View
      // The row's width never changes: one long pill and the rest short, however they are shared out.
      style={[{ flexDirection: 'row', gap: PILL_GAP, width: count * PILL + PILL + (count - 1) * PILL_GAP }, style]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {Array.from({ length: count }, (_, i) => (
        <IndicatorPill key={i} index={i} progress={progress} />
      ))}
    </View>
  );
}

function IndicatorPill({ index, progress }: { index: number; progress: SharedValue<number> }) {
  const theme = useTheme();
  const front = theme.muted;
  const rest = theme.track;
  const style = useAnimatedStyle(() => {
    // 1 when this photo is in front, 0 when it is a whole photo away.
    const on = 1 - Math.min(Math.abs(progress.value - index), 1);
    return { width: PILL + PILL * on, backgroundColor: interpolateColor(on, [0, 1], [rest, front]) };
  });
  return <Animated.View style={[{ height: PILL_HEIGHT, borderRadius: PILL_HEIGHT / 2 }, style]} />;
}
