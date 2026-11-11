import { Image } from 'expo-image';
import { useCallback } from 'react';
import { Pressable, type ImageSourcePropType, type ViewProps } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import { Pager } from '../layout/Pager';

/**
 * Horizontally paged images.
 *
 * Only the images move — whatever sits around the carousel stays put. A `Pager`
 * of full-bleed photos: paging, the controlled index and the live `progress` all
 * come from there.
 */

export type CarouselImage = {
  /** Stable identity for the list. */
  key: string;
  source: ImageSourcePropType | undefined;
  /**
   * BlurHash shown while the photo decodes. Without one the frame is the screen's
   * background until the photo lands, which reads as a white flash.
   *
   * Pass the bare hash. It is wrapped below, because expo-image only recognises a
   * loose string as a hash when it is prefixed `blurhash:/` — otherwise it takes it
   * for a URL, fails to load it and shows nothing at all.
   */
  placeholder?: string;
  /**
   * A smaller copy of the same photo already on the phone (a feed card's), shown
   * until this one loads — the picture is there at once and sharpens, rather
   * than blanking first. Takes precedence over `placeholder`.
   */
  placeholderUri?: string;
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
  /** A tap on a photo (the post page opens it full screen). Without it, photos are not buttons. */
  onPressImage?: (index: number) => void;
  className?: string;
};

/** Long enough to read as a fade rather than a pop, short enough not to feel slow. */
const FADE_MS = 220;

const keyOf = (image: CarouselImage) => image.key;

export function ImageCarousel({ images, onPressImage, ...props }: ImageCarouselProps) {
  const renderPage = useCallback(
    (item: CarouselImage, index: number) => {
      if (!item.source) return <></>;
      const image = (
        <Image
          source={item.source}
          placeholder={
            item.placeholderUri
              ? { uri: item.placeholderUri }
              : item.placeholder
                ? { blurhash: item.placeholder }
                : undefined
          }
          placeholderContentFit="cover"
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          // Keep decoded frames in memory as well as on disk: swiping back to a
          // page the user has already seen should not decode it again.
          cachePolicy="memory-disk"
          transition={FADE_MS}
          accessibilityLabel={item.accessibilityLabel}
          accessible={Boolean(item.accessibilityLabel) && !onPressImage}
        />
      );
      if (!onPressImage) return image;
      // A tap opens the photo; a drag still pages, since the pager takes the move.
      return (
        <Pressable
          onPress={() => onPressImage(index)}
          accessibilityRole="imagebutton"
          accessibilityLabel={item.accessibilityLabel}
          accessibilityHint="Opens the photo full screen"
          style={{ width: '100%', height: '100%' }}
        >
          {image}
        </Pressable>
      );
    },
    [onPressImage],
  );

  return <Pager pages={images} keyOf={keyOf} renderPage={renderPage} {...props} />;
}
