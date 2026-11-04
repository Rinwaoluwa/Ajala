import { Host } from '@expo/ui';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';

import { NativeIcon, SortableGrid, Text, icons } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { palette } from '@shared/theme';

import type { DraftPhoto } from '../../domain/entities/PostDraft';
import { PHOTOS_MAX } from '../../domain/rules/postDraftRules';
import { wizardCopy } from '../copy';

/**
 * "Photos * 2–4 photos required" (Figma Basic Details): square tiles three to a
 * row, each numbered at its top-left with a × at its top-right, and the dashed
 * "Add photo" tile after them until there are four.
 *
 * Hold a photo and drag it to change the order; the first is the cover. New
 * photos fade in over 200ms.
 */

const COLUMNS = 3;
const GAP = 12;

export type PhotoGridProps = {
  photos: DraftPhoto[];
  onAdd: () => void;
  onRemove: (key: string) => void;
  onMove: (from: number, to: number) => void;
};

export function PhotoGrid({ photos, onAdd, onRemove, onMove }: PhotoGridProps) {
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <Text variant="bodyMd" style={{ flex: 1 }}>
          {wizardCopy.photos.label}
          <Text variant="bodyMd"> * </Text>
          <Text variant="bodySm" tone="muted">
            {wizardCopy.photos.rule}
          </Text>
        </Text>
        <Text variant="bodySm" tone="muted" accessibilityLabel={`${photos.length} of ${PHOTOS_MAX} photos`}>
          {`${photos.length}/${PHOTOS_MAX}`}
        </Text>
      </View>
      <View className="mt-12">
        <SortableGrid
          items={photos}
          keyOf={(p) => p.key}
          columns={COLUMNS}
          gap={GAP}
          cellHeight={(w) => w}
          onMove={onMove}
          itemLabel={(i) => wizardCopy.photos.item(i + 1)}
          renderItem={(photo, index) => (
            <PhotoTile photo={photo} index={index} onRemove={() => onRemove(photo.key)} />
          )}
          footer={photos.length < PHOTOS_MAX ? <AddPhotoTile onPress={onAdd} /> : null}
        />
      </View>
      {photos.length > 1 ? (
        <Animated.View entering={FadeIn.duration(200)}>
          <Text variant="bodyXs" tone="muted" className="mt-12 text-center">
            {wizardCopy.photos.reorder}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

function PhotoTile({ photo, index, onRemove }: { photo: DraftPhoto; index: number; onRemove: () => void }) {
  const theme = useTheme();
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      accessible
      accessibilityLabel={
        index === 0
          ? `${wizardCopy.photos.item(1)}, ${wizardCopy.photos.cover}`
          : wizardCopy.photos.item(index + 1)
      }
      style={{ flex: 1, borderRadius: 10, overflow: 'hidden', backgroundColor: theme.skeleton }}
    >
      <Image source={{ uri: photo.uri }} style={{ flex: 1 }} contentFit="cover" transition={200} />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          minWidth: 20,
          height: 20,
          paddingHorizontal: 4,
          borderRadius: 10,
          backgroundColor: theme.primaryFill,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variant="bodyXs" maxFontSizeMultiplier={1.3} style={{ color: palette.white }}>
          {index + 1}
        </Text>
      </View>
      <Pressable
        onPress={onRemove}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={wizardCopy.photos.remove(index + 1)}
        style={{
          position: 'absolute',
          top: 6,
          right: 6,
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: 'rgba(13, 23, 21, 0.75)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Host matchContents pointerEvents="none" ignoreSafeArea="all">
          <NativeIcon source={icons.close} size={10} color={palette.white} />
        </Host>
      </Pressable>
    </Animated.View>
  );
}

function AddPhotoTile({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });
  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={onPress}
      onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      accessibilityRole="button"
      accessibilityLabel={wizardCopy.photos.add}
      testID="create-add-photo"
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: 8,
      }}
    >
      {/* Drawn rather than a dashed border, so the dash looks the same on iOS and Android. */}
      {size.width > 0 ? (
        <Svg width={size.width} height={size.height} style={{ position: 'absolute', top: 0, left: 0 }}>
          <Rect
            x={1}
            y={1}
            width={size.width - 2}
            height={size.height - 2}
            rx={12}
            fill="none"
            stroke={theme.primary}
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />
        </Svg>
      ) : null}
      <Svg width={18} height={18} viewBox="0 0 18 18">
        <Path d="M9 2v14M2 9h14" stroke={theme.primary} strokeWidth={1.6} strokeLinecap="round" />
      </Svg>
      <Text variant="bodySm" tone="primary" className="text-center" maxFontSizeMultiplier={1.4}>
        {wizardCopy.photos.add}
      </Text>
    </TouchableOpacity>
  );
}
