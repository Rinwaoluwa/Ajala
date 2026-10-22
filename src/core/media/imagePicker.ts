import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

/**
 * Picking a photo for upload. The only file that imports `expo-image-picker` and
 * `expo-image-manipulator`.
 *
 * The API takes JPEG, PNG or WebP up to 5 MB (spec §1.4), and phone photos are
 * often larger, so every pick is cropped square by the system editor, scaled so
 * its long edge is at most `maxEdge`, and re-encoded as JPEG before it leaves the
 * phone. The result is a file `FormData` can carry as `{ uri, name, type }`.
 *
 * Resolves with `null` when the person cancels or refuses access; that is a
 * choice, not an error.
 */

export type PickedImage = { uri: string; name: string; type: 'image/jpeg' };
export type ImageSource = 'library' | 'camera';

export type PickImageOptions = {
  source: ImageSource;
  /** Long edge in pixels after resizing. */
  maxEdge?: number;
  /** JPEG quality, 0–1. */
  quality?: number;
};

export async function pickSquareImage({
  source,
  maxEdge = 1024,
  quality = 0.85,
}: PickImageOptions): Promise<PickedImage | null> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  };

  let result: ImagePicker.ImagePickerResult;
  try {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return null;
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      result = await ImagePicker.launchImageLibraryAsync(options);
    }
  } catch {
    return null;
  }
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return null;

  const longEdge = Math.max(asset.width, asset.height);
  const context = ImageManipulator.manipulate(asset.uri);
  if (longEdge > maxEdge) {
    context.resize(asset.width >= asset.height ? { width: maxEdge } : { height: maxEdge });
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: quality });

  return { uri: saved.uri, name: 'photo.jpg', type: 'image/jpeg' };
}
