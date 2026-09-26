import { Asset } from 'expo-asset';
import { useEffect, useState } from 'react';

/**
 * Resolves a bundled asset (`require('./x.png')`) to a `file://` URI on the device.
 *
 * Native views that read files themselves — SwiftUI's `Image(uiImage:)` via Expo
 * UI — cannot take a Metro module id. Resolved URIs are cached for the life of the
 * process, so a second button with the same mark renders on its first frame.
 */

const cache = new Map<number, string>();

export function useLocalAssetUri(moduleId: number | undefined): string | undefined {
  const [uri, setUri] = useState(() => (moduleId === undefined ? undefined : cache.get(moduleId)));

  useEffect(() => {
    if (moduleId === undefined || cache.has(moduleId)) return;
    let cancelled = false;

    Asset.fromModule(moduleId)
      .downloadAsync()
      .then((asset) => {
        const local = asset.localUri ?? undefined;
        if (!local) return;
        cache.set(moduleId, local);
        if (!cancelled) setUri(local);
      })
      .catch(() => {
        // The icon stays blank; the button label still carries the meaning.
      });

    return () => {
      cancelled = true;
    };
  }, [moduleId]);

  return moduleId === undefined ? undefined : (uri ?? cache.get(moduleId));
}
