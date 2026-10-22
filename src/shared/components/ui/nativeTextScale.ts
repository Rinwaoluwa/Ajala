import type { ModifierConfig } from '@expo/ui/swift-ui/modifiers';

/**
 * Android and web: no-op. Compose sizes text in `sp`, which follows the system
 * font size and already stops at Android's 200% maximum — the same ceiling as
 * `MAX_TEXT_SCALE`. iOS is in `nativeTextScale.ios.ts`.
 */
export function nativeTextScaleCap(_ceiling: 'text' | 'link' = 'text'): ModifierConfig[] {
  return [];
}
