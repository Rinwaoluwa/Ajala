import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, StatusBar, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Pager } from '../layout/Pager';
import { PaginationDots } from '../ui/PaginationDots';
import { Text } from '../ui/Text';

/**
 * A post's photos full screen (tapped from the post page): black behind,
 * swipe between them, pinch to zoom up to 4×, drag the zoomed photo about,
 * double-tap to zoom in to 2.5× and back. A × at the top closes it; so does
 * the system back gesture. The dots and "2 of 4" sit at the foot.
 *
 * Zoom is per photo and resets when it leaves the screen, so every page opens
 * at its natural size. Pinch and drag run on the UI thread; while a photo is
 * zoomed, its drag takes the finger before the pager does.
 *
 * Opened from a photo in the feed (`origin`), the photo itself grows from its
 * place to the full width while black fades in behind it, as the reference
 * recording does (docs/design/feed-post-motion.md §6): 220ms, easing out, most
 * of the way in the first 100ms. Scale and position only. Then the pager takes
 * over in the same frame. It closes with a short fade. With Reduce Motion it
 * fades in instead of growing. Without `origin` it opens with the system's fade,
 * as it always has (the post page, a chat).
 */

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

export type PhotoViewerProps = {
  images: string[];
  /** Which photo opens first. */
  initialIndex: number;
  isPresented: boolean;
  onDismiss: () => void;
  /** Said for each photo: "Sunset hike, photo 2 of 4". */
  label?: string;
  /**
   * Where the tapped photo sits on screen (`MediaCarousel`'s `onOpen`): the
   * viewer opens by growing it from there. Left out, it fades in.
   */
  origin?: PhotoOrigin | null;
  /**
   * Smaller copies of the same photos, already on screen behind the viewer
   * (the feed's card size): what grows, and what holds each page until its
   * full-size photo has loaded.
   */
  previews?: string[];
};

/** A photo's frame in the window, its corner radius, and its own width ÷ height once known. */
export type PhotoOrigin = {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  aspect: number | null;
};

const OPEN_MS = 220;
const CLOSE_MS = 160;
/** How long the opening waits to be told its window is on screen before starting anyway. */
const OPEN_FALLBACK_MS = 400;

/** The viewer's controls sit on a dark disc or pill with a faint light rim, readable over any photo. */
const CONTROL_FILL = 'rgba(0,0,0,0.55)';
const CONTROL_RIM = 'rgba(255,255,255,0.35)';

export function PhotoViewer({
  images,
  initialIndex,
  isPresented,
  onDismiss,
  label,
  origin = null,
  previews,
}: PhotoViewerProps) {
  // Opened from a photo's place, the viewer draws its own opening and closing over the
  // screen behind it; otherwise the system's fade does both.
  const own = origin !== null;
  // The window takes a few frames to appear after it is asked for. The opening waits for it
  // (`onShow`): started any sooner, most of the photo's growth had already run unseen, and
  // the first frame on screen was a nearly full-size photo on black.
  const [onScreen, setOnScreen] = useState(false);
  if (!isPresented && onScreen) setOnScreen(false);
  return (
    <Modal
      visible={isPresented}
      animationType={own ? 'none' : 'fade'}
      presentationStyle="overFullScreen"
      transparent={own}
      statusBarTranslucent
      onShow={() => setOnScreen(true)}
      onRequestClose={onDismiss}
    >
      {/* Mounted afresh each time the modal opens, so it starts on the tapped photo. */}
      <Viewer
        images={images}
        initialIndex={initialIndex}
        onDismiss={onDismiss}
        label={label}
        origin={origin}
        previews={previews}
        onScreen={onScreen}
      />
    </Modal>
  );
}

function Viewer({
  images,
  initialIndex,
  onDismiss,
  label,
  origin = null,
  previews,
  onScreen,
}: Omit<PhotoViewerProps, 'isPresented'> & {
  /** The viewer's window has appeared: its own opening may begin. */
  onScreen: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(initialIndex);
  const progress = useSharedValue(initialIndex);

  // Its own opening (see the header): 0 as the photo leaves its place, 1 once it has landed.
  const own = origin !== null;
  const grows = own && !reduceMotion && origin.width > 0 && origin.height > 0;
  const opened = useSharedValue(own ? 0 : 1);
  const closing = useSharedValue(1);
  // The growing photo stays until the pager under it has had a frame to draw.
  const [landed, setLanded] = useState(!grows);
  // Begun once the window is on screen, or after a short wait should the system never say so:
  // a viewer that never opened would be a black hole in the app. Once only.
  const started = useRef(false);
  const begin = useCallback(() => {
    if (started.current) return;
    started.current = true;
    opened.set(
      withTiming(1, { duration: OPEN_MS, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(setLanded)(true);
      }),
    );
  }, [opened]);
  useEffect(() => {
    if (!own) return;
    if (onScreen) {
      begin();
      return;
    }
    const timer = setTimeout(begin, OPEN_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [own, onScreen, begin]);

  const close = useCallback(() => {
    if (!own) {
      onDismiss();
      return;
    }
    closing.set(
      withTiming(0, { duration: CLOSE_MS, easing: Easing.in(Easing.quad) }, (finished) => {
        if (finished) runOnJS(onDismiss)();
      }),
    );
  }, [own, closing, onDismiss]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: closing.value }));
  // Black by three quarters of the way, as the recording's feed is.
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(opened.value, [0, 0.75], [0, 1], Extrapolation.CLAMP),
  }));
  // The pager appears the moment the growing photo lands on it; with nothing growing
  // (Reduce Motion) it fades in with the black.
  const pagerStyle = useAnimatedStyle(() => ({
    opacity: grows ? (opened.value >= 1 ? 1 : 0) : opened.value,
  }));
  const controlsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(opened.value, [0.6, 1], [0, 1], Extrapolation.CLAMP),
  }));

  const renderPage = useCallback(
    (uri: string, i: number) => (
      <ZoomablePhoto
        uri={uri}
        preview={previews?.[i]}
        width={width}
        height={height}
        active={i === index}
        accessibilityLabel={label ? `${label}, photo ${i + 1} of ${images.length}` : undefined}
      />
    ),
    [width, height, index, label, images.length, previews],
  );

  return (
    <Animated.View style={[{ flex: 1, backgroundColor: own ? 'transparent' : '#000' }, rootStyle]}>
      <StatusBar barStyle="light-content" />
      {own ? (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, backdropStyle]}
        />
      ) : null}
      <Animated.View style={[{ flex: 1 }, pagerStyle]}>
        <Pager
          pages={images}
          keyOf={(uri) => uri}
          renderPage={renderPage}
          index={index}
          onIndexChange={setIndex}
          progress={progress}
          style={{ flex: 1 }}
        />
      </Animated.View>
      {grows && !landed ? (
        <GrowingPhoto
          uri={previews?.[initialIndex] ?? images[initialIndex]}
          origin={origin}
          screen={{ width, height }}
          opened={opened}
        />
      ) : null}
      <Animated.View pointerEvents="box-none" style={[StyleSheet.absoluteFill, controlsStyle]}>
        {/* A plain style, not a function: the class-name interop drops function styles on Pressable. */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={close}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={{
            position: 'absolute',
            top: insets.top + 8,
            right: 16,
            width: 40,
            height: 40,
            borderRadius: 20,
            // A dark disc with a faint light rim: the white × reads on a white photo (where a
            // pale disc vanished) and on a black one (where the rim still shows its edge).
            backgroundColor: CONTROL_FILL,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: CONTROL_RIM,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        {images.length > 1 ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: Math.max(insets.bottom, 16) + 8,
              alignItems: 'center',
              gap: 10,
            }}
          >
            {/* On the same dark pill as the ×, so the dots and the count read on a white photo too. */}
            <View
              style={{
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: CONTROL_FILL,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: CONTROL_RIM,
              }}
            >
              <PaginationDots count={images.length} progress={progress} activeIndex={index} onSurface />
              <Text variant="bodyXs" style={{ color: '#FFFFFF' }}>
                {`${index + 1} of ${images.length}`}
              </Text>
            </View>
          </View>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}

/**
 * The tapped photo on its way from its place in the feed to the full width.
 *
 * It is laid out once, at the frame the pager will show it in (fitted to the
 * screen at its own shape), and moved by transform alone: the box is scaled
 * down and shifted onto the tile it came from, and the photo inside is scaled
 * the other way so it is never squashed (it only shows more of itself as the
 * tile's crop opens up). The corners square off on the way.
 */
function GrowingPhoto({
  uri,
  origin,
  screen,
  opened,
}: {
  uri: string;
  origin: PhotoOrigin;
  screen: { width: number; height: number };
  opened: SharedValue<number>;
}) {
  // Its own shape once known; until then the tile's, so nothing jumps.
  const aspect = origin.aspect ?? origin.width / origin.height;
  const fitWidth = Math.min(screen.width, screen.height * aspect);
  const fitHeight = fitWidth / aspect;
  const left = (screen.width - fitWidth) / 2;
  const top = (screen.height - fitHeight) / 2;
  // From: the tile, as a scale and a shift of the fitted frame.
  const fromX = origin.x + origin.width / 2 - (left + fitWidth / 2);
  const fromY = origin.y + origin.height / 2 - (top + fitHeight / 2);
  const fromScaleX = origin.width / fitWidth;
  const fromScaleY = origin.height / fitHeight;
  // The photo covers its tile: scaled by whichever side needs more.
  const fromPhoto = Math.max(fromScaleX, fromScaleY);
  const radius = origin.radius;

  const box = useAnimatedStyle(() => {
    const t = opened.value;
    const sx = fromScaleX + (1 - fromScaleX) * t;
    return {
      borderRadius: (radius * (1 - t)) / sx,
      transform: [
        { translateX: fromX * (1 - t) },
        { translateY: fromY * (1 - t) },
        { scaleX: sx },
        { scaleY: fromScaleY + (1 - fromScaleY) * t },
      ],
    };
  });
  const photo = useAnimatedStyle(() => {
    const t = opened.value;
    const sx = fromScaleX + (1 - fromScaleX) * t;
    const sy = fromScaleY + (1 - fromScaleY) * t;
    const m = fromPhoto + (1 - fromPhoto) * t;
    return { transform: [{ scaleX: m / sx }, { scaleY: m / sy }] };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left, top, width: fitWidth, height: fitHeight, overflow: 'hidden' }, box]}
    >
      <Animated.View style={[{ flex: 1 }, photo]}>
        <Image source={{ uri }} style={{ flex: 1 }} contentFit="cover" cachePolicy="memory-disk" />
      </Animated.View>
    </Animated.View>
  );
}

function ZoomablePhoto({
  uri,
  preview,
  width,
  height,
  active,
  accessibilityLabel,
}: {
  uri: string;
  /** A smaller copy already loaded, shown until the full-size photo is. */
  preview?: string;
  width: number;
  height: number;
  active: boolean;
  accessibilityLabel?: string;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  // The drag only takes the finger once the photo is zoomed; otherwise the pager swipes.
  const [zoomed, setZoomed] = useState(false);

  // Swiped away: the photo comes back at its natural size next time it is seen.
  const [wasActive, setWasActive] = useState(active);
  if (wasActive !== active) {
    setWasActive(active);
    if (!active) {
      scale.set(1);
      savedScale.set(1);
      tx.set(0);
      ty.set(0);
      savedTx.set(0);
      savedTy.set(0);
      setZoomed(false);
    }
  }

  const clamp = (value: number, limit: number) => {
    'worklet';
    return Math.min(Math.max(value, -limit), limit);
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.set(Math.min(Math.max(savedScale.value * e.scale, 1), MAX_SCALE));
    })
    .onEnd(() => {
      savedScale.set(scale.value);
      if (scale.value <= 1.02) {
        scale.set(withTiming(1));
        savedScale.set(1);
        tx.set(withTiming(0));
        ty.set(withTiming(0));
        savedTx.set(0);
        savedTy.set(0);
        runOnJS(setZoomed)(false);
      } else {
        runOnJS(setZoomed)(true);
      }
    });

  const pan = Gesture.Pan()
    .enabled(zoomed)
    .onUpdate((e) => {
      const s = scale.value;
      tx.set(clamp(savedTx.value + e.translationX, (width * (s - 1)) / 2));
      ty.set(clamp(savedTy.value + e.translationY, (height * (s - 1)) / 2));
    })
    .onEnd(() => {
      savedTx.set(tx.value);
      savedTy.set(ty.value);
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.set(withTiming(1));
        savedScale.set(1);
        tx.set(withTiming(0));
        ty.set(withTiming(0));
        savedTx.set(0);
        savedTy.set(0);
        runOnJS(setZoomed)(false);
      } else {
        scale.set(withTiming(DOUBLE_TAP_SCALE));
        savedScale.set(DOUBLE_TAP_SCALE);
        runOnJS(setZoomed)(true);
      }
    });

  const gesture = Gesture.Simultaneous(pinch, pan, doubleTap);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ width, height, alignItems: 'center', justifyContent: 'center' }, style]}>
        <Image
          source={{ uri }}
          style={{ width, height }}
          contentFit="contain"
          placeholder={preview ? { uri: preview } : undefined}
          placeholderContentFit="contain"
          cachePolicy="memory-disk"
          transition={200}
          accessibilityLabel={accessibilityLabel}
          accessible={Boolean(accessibilityLabel)}
        />
      </Animated.View>
    </GestureDetector>
  );
}
