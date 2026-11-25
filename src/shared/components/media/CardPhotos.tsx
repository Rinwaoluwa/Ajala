import { Image } from 'expo-image';
import { memo, useRef, useState } from 'react';
import { Pressable, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { ScrollView as GestureScrollView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useTheme } from '@shared/hooks/useTheme';
import { palette } from '@shared/theme';

import { Text } from '../ui/Text';

/**
 * The gesture library's scroll view, animated: once the photos move it keeps the touch, so
 * swiping through them never also swipes the page to the next tab (`SwipePager`).
 */
const Pages = Animated.createAnimatedComponent(GestureScrollView);

/**
 * A post's photos at the head of its card (Home design, 24 Nov): a wide banner
 * the card's whole width, one photo at a time.
 *
 *   - Sixteen wide to nine tall: tall enough to see what the photo is of,
 *     which the card is a quick look at (product, 24 Nov; the design drew a
 *     strip three times as wide as tall). The photo covers it; a tap opens it
 *     whole.
 *   - More than one photo, and they are pages swiped between: the platform's
 *     own paging scroller, so the feel under the finger and the rubber band at
 *     either end are the system's.
 *   - Dots at the foot say which is in front: the front one solid, the rest
 *     rings. They follow the scroll itself, on the UI thread, filling as a
 *     photo comes in. "1/4" at the foot's right counts them.
 *   - Both are white, on a soft dark fade at the photo's foot, so they read on
 *     a pale photo as well as a dark one.
 *   - One photo alone is just the photo: no dots, no count, nothing to swipe.
 *
 * It has no corners of its own: the card it heads clips it.
 *
 * Tapping a photo hands back which one and where it is on screen (`onOpen`),
 * so the viewer can grow it from its place (`PhotoViewer`).
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

export type CardPhotosProps = {
  /** Card-size photo URLs, in order. */
  images: readonly string[];
  /**
   * How wide the card is, when its owner knows (the screen less its margins):
   * the pages are then the right width from the first frame. It is measured
   * all the same, and the measure wins.
   */
  width?: number;
  onOpen: (index: number, from: MediaFrame) => void;
  /** Said for each photo: "Sunset walk, photo 2 of 3". */
  label?: string;
};

/** Width ÷ height. A card in outline draws its head the same shape (`PostListCardSkeleton`). */
export const CARD_PHOTOS_ASPECT = 16 / 9;
const DOT = 7;
const DOT_GAP = 7;

function CardPhotosComponent({ images, width: hint, onOpen, label }: CardPhotosProps) {
  const theme = useTheme();
  const count = images.length;
  const [measured, setMeasured] = useState<number | null>(null);
  const width = measured ?? hint ?? 0;
  const x = useSharedValue(0);
  /** The photo in front, for the count. */
  const [front, setFront] = useState(0);

  const onScroll = useAnimatedScrollHandler((e) => {
    x.set(e.contentOffset.x);
  });
  // Which photo is in front, in photos: 0, 0.4, 1 … Held at the ends, so a pull past the
  // first or last photo leaves the dots alone.
  const progress = useDerivedValue(() => (width > 0 ? Math.min(Math.max(x.value / width, 0), count - 1) : 0));
  useAnimatedReaction(
    () => Math.round(progress.value),
    (now, before) => {
      if (now !== before) scheduleOnRN(setFront, now);
    },
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.width;
    if (Math.abs(next - width) > 0.5) setMeasured(next);
  };

  if (count === 0) return null;

  return (
    <View onLayout={onLayout} style={{ aspectRatio: CARD_PHOTOS_ASPECT, overflow: 'hidden', backgroundColor: theme.skeleton }}>
      {count === 1 ? (
        <Tile uri={images[0]!} index={0} count={1} label={label} onOpen={onOpen} style={{ flex: 1 }} />
      ) : width > 0 ? (
        <Pages
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={{ flex: 1 }}
        >
          {images.map((uri, i) => (
            <Tile
              // By place as well as address: the same photo added twice is two pages.
              key={`${i}:${uri}`}
              uri={uri}
              index={i}
              count={count}
              label={label}
              onOpen={onOpen}
              style={{ width, height: '100%' }}
            />
          ))}
        </Pages>
      ) : null}

      {count > 1 ? (
        <View
          pointerEvents="none"
          // Said with each photo ("photo 2 of 4"), so not a second time here.
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={{
            position: 'absolute',
            inset: 0,
            justifyContent: 'flex-end',
            // The fade the white marks sit on: nothing over most of the photo.
            experimental_backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.4) 100%)',
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: DOT_GAP, marginBottom: 10 }}>
            {images.map((uri, i) => (
              <Dot key={`${i}:${uri}`} index={i} progress={progress} />
            ))}
          </View>
          <View
            style={{
              position: 'absolute',
              right: 10,
              bottom: 8,
              borderRadius: 999,
              paddingHorizontal: 8,
              paddingVertical: 2,
              backgroundColor: 'rgba(0,0,0,0.55)',
            }}
          >
            {/* It sits on the photo, which does not grow with the text size: nor does it, much. */}
            <Text variant="labelXs" maxFontSizeMultiplier={1.3} style={{ color: palette.white }}>
              {`${front + 1}/${count}`}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** One dot: a white ring, filled by how nearly its photo is the one in front. */
function Dot({ index, progress }: { index: number; progress: SharedValue<number> }) {
  const fill = useAnimatedStyle(() => ({ opacity: 1 - Math.min(Math.abs(progress.value - index), 1) }));
  return (
    <View
      style={{
        width: DOT,
        height: DOT,
        borderRadius: DOT / 2,
        borderWidth: 1.5,
        borderColor: palette.white,
      }}
    >
      <Animated.View style={[{ flex: 1, borderRadius: DOT / 2, backgroundColor: palette.white }, fill]} />
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
  onOpen: CardPhotosProps['onOpen'];
  style: StyleProp<ViewStyle>;
}) {
  const tile = useRef<View>(null);
  const aspect = useRef<number | null>(null);
  const open = () => {
    const from = (x: number, y: number, width: number, height: number) =>
      onOpen(index, { x, y, width, height, radius: 0, aspect: aspect.current });
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
      style={style}
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

/** Memoised: a feed redraws often, and a card's photos only change with the post. */
export const CardPhotos = memo(CardPhotosComponent);
