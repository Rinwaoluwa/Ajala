import { Image, Spacer } from '@expo/ui/swift-ui';
import { frame, resizable } from '@expo/ui/swift-ui/modifiers';

import type { NativeIconProps } from './NativeIcon';
import { useLocalAssetUri } from './useLocalAssetUri';

/**
 * iOS: an SF Symbol, or a full-colour bitmap for marks SF Symbols cannot draw
 * (the Google "G").
 *
 * Render inside an Expo UI tree — a Host, a Button's label, a BottomSheet.
 *
 * Expo UI's universal `Icon` only takes SF Symbols on iOS, so bitmaps go through
 * SwiftUI's `Image(uiImage:)`, which reads a local file. `useLocalAssetUri`
 * resolves the bundled asset to that file; until it has, an empty frame of the same
 * size holds the space so the label beside it does not shift.
 */
export function NativeIcon({ source, size, color }: NativeIconProps) {
  const fileUri = useLocalAssetUri('image' in source ? source.image : undefined);

  if ('symbol' in source) {
    return <Image systemName={source.symbol} size={size} color={color} />;
  }

  if (!fileUri) {
    return <Spacer modifiers={[frame({ width: size, height: size })]} />;
  }

  return <Image uiImage={fileUri} modifiers={[resizable(), frame({ width: size, height: size })]} />;
}
