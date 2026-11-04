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

export type PickImagesOptions = {
  /** How many may be chosen at once (the space left in a carousel). */
  limit: number;
  /** Long edge in pixels after resizing; the API's guidance is at most 2048 (spec §7). */
  maxEdge?: number;
  quality?: number;
};

/**
 * Several photos from the library, in the order they were tapped — a post's
 * carousel. Not cropped: a post keeps each photo's own shape. Each is scaled so
 * its long edge is at most `maxEdge` and re-encoded as JPEG, which keeps it
 * comfortably under the API's 5 MB.
 *
 * Resolves with `[]` when the person cancels or refuses access.
 */
export async function pickImages({
  limit,
  maxEdge = 2048,
  quality = 0.8,
}: PickImagesOptions): Promise<PickedImage[]> {
  if (limit <= 0) return [];
  let result: ImagePicker.ImagePickerResult;
  try {
    result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: limit > 1,
      selectionLimit: limit,
      orderedSelection: true,
      quality: 1,
    });
  } catch {
    return [];
  }
  if (result.canceled) return [];

  const picked: PickedImage[] = [];
  for (const asset of result.assets.slice(0, limit)) {
    const longEdge = Math.max(asset.width, asset.height);
    const context = ImageManipulator.manipulate(asset.uri);
    if (longEdge > maxEdge) {
      context.resize(asset.width >= asset.height ? { width: maxEdge } : { height: maxEdge });
    }
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: quality });
    picked.push({ uri: saved.uri, name: `photo-${picked.length + 1}.jpg`, type: 'image/jpeg' });
  }
  return picked;
}

/**
 * A copy of an image on this phone, for uploading one that is only on the web —
 * a draft's photo being sent again with the rest of its carousel. Local files
 * come back as they are. Null when it cannot be fetched.
 */
export async function localiseImage(uri: string, quality = 0.85): Promise<PickedImage | null> {
  if (!/^https?:\/\//i.test(uri)) return { uri, name: 'photo.jpg', type: 'image/jpeg' };
  try {
    const image = await ImageManipulator.manipulate(uri).renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: quality });
    return { uri: saved.uri, name: 'photo.jpg', type: 'image/jpeg' };
  } catch {
    return null;
  }
}
