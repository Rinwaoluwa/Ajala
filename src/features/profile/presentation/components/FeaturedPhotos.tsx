import { Image } from 'expo-image';
import { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';

import { Host, NativeIcon, PhotoViewer, SvgIcon, Text, icons } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

import type { ProfilePhoto } from '../../domain/entities/Profile';
import { profileViewCopy } from '../profileViewCopy';

/**
 * "Featured Photos" (Figma Own Profile, Other User): the gallery from Edit
 * profile (up to six), with "5 photos ›" at the right of the heading and the
 * first three in a row under it. A tap opens a photo full screen, where all of
 * them can be swiped and zoomed; "5 photos ›" opens the first.
 *
 * `own`: the person's own profile, which offers "Add photos" when there are
 * none. Someone else's profile with no photos leaves the section out.
 */

const SHOWN = 3;

export function FeaturedPhotos({
  photos,
  own,
  name,
  onAdd,
}: {
  photos: readonly ProfilePhoto[];
  own: boolean;
  /** Whose they are, for the photos' spoken labels. */
  name: string;
  /** Your own profile: where "Add photos" goes (Edit profile). */
  onAdd?: () => void;
}) {
  const theme = useTheme();
  const copy = profileViewCopy.photos;
  const [open, setOpen] = useState<number | null>(null);
  if (!own && photos.length === 0) return null;

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <SvgIcon name="photos" size={18} tint={theme.primary} />
        <Text variant="headingSm" accessibilityRole="header" style={{ flex: 1, fontSize: 16, lineHeight: 22 }}>
          {copy.title}
        </Text>
        {photos.length ? (
          <TouchableOpacity
            activeOpacity={0.6}
            onPress={() => setOpen(0)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={copy.seeAll(photos.length)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <Text variant="bodySm" tone="muted">
              {copy.count(photos.length)}
            </Text>
            <Host matchContents pointerEvents="none" ignoreSafeArea="all">
              <NativeIcon source={icons.chevronRight} size={12} color={theme.muted} />
            </Host>
          </TouchableOpacity>
        ) : null}
      </View>

      {photos.length ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {Array.from({ length: SHOWN }, (_, index) => {
            const photo = photos[index];
            // Empty slots keep the row's thirds, so one photo is not stretched across the page.
            if (!photo) return <View key={`gap-${index}`} style={{ flex: 1 }} />;
            return (
              <TouchableOpacity
                key={photo.id}
                activeOpacity={0.8}
                onPress={() => setOpen(index)}
                accessibilityRole="imagebutton"
                accessibilityLabel={copy.open(name, index + 1, photos.length)}
                style={{
                  flex: 1,
                  aspectRatio: 1.18,
                  borderRadius: 12,
                  overflow: 'hidden',
                  backgroundColor: theme.skeleton,
                }}
              >
                <Image source={{ uri: photo.thumbUrl }} style={{ flex: 1 }} contentFit="cover" transition={200} />
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Text variant="bodySm" tone="muted" style={{ flex: 1, minWidth: 180 }}>
            {copy.empty}
          </Text>
          {onAdd ? (
            <TouchableOpacity activeOpacity={0.6} onPress={onAdd} hitSlop={8} accessibilityRole="button">
              <Text variant="labelSm" tone="primary">
                {copy.add}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      <PhotoViewer
        images={photos.map((p) => p.url)}
        initialIndex={open ?? 0}
        isPresented={open !== null}
        onDismiss={() => setOpen(null)}
        label={name}
      />
    </View>
  );
}
