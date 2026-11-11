import { Image } from 'expo-image';
import { useCallback, useState } from 'react';
import { Modal, StatusBar, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
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
};

export function PhotoViewer({ images, initialIndex, isPresented, onDismiss, label }: PhotoViewerProps) {
  return (
    <Modal
      visible={isPresented}
      animationType="fade"
      presentationStyle="overFullScreen"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      {/* Mounted afresh each time the modal opens, so it starts on the tapped photo. */}
      <Viewer images={images} initialIndex={initialIndex} onDismiss={onDismiss} label={label} />
    </Modal>
  );
}

function Viewer({ images, initialIndex, onDismiss, label }: Omit<PhotoViewerProps, 'isPresented'>) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(initialIndex);
  const progress = useSharedValue(initialIndex);

  const renderPage = useCallback(
    (uri: string, i: number) => (
      <ZoomablePhoto
        uri={uri}
        width={width}
        height={height}
        active={i === index}
        accessibilityLabel={label ? `${label}, photo ${i + 1} of ${images.length}` : undefined}
      />
    ),
    [width, height, index, label, images.length],
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar barStyle="light-content" />
      <Pager
        pages={images}
        keyOf={(uri) => uri}
        renderPage={renderPage}
        index={index}
        onIndexChange={setIndex}
        progress={progress}
        style={{ flex: 1 }}
      />
      {/* A plain style, not a function: the class-name interop drops function styles on Pressable. */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onDismiss}
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
          backgroundColor: 'rgba(255,255,255,0.25)',
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
          <PaginationDots count={images.length} progress={progress} activeIndex={index} onSurface />
          <Text variant="bodyXs" style={{ color: 'rgba(255,255,255,0.8)' }}>
            {`${index + 1} of ${images.length}`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function ZoomablePhoto({
  uri,
  width,
  height,
  active,
  accessibilityLabel,
}: {
  uri: string;
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
          cachePolicy="memory-disk"
          transition={200}
          accessibilityLabel={accessibilityLabel}
          accessible={Boolean(accessibilityLabel)}
        />
      </Animated.View>
    </GestureDetector>
  );
}
