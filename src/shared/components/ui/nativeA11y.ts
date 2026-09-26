import type { ModifierConfig } from '@expo/ui/swift-ui/modifiers';

/**
 * Android and web: no-op. Expo UI's modifiers are platform-specific, and the
 * Compose `Icon` takes its own `accessibilityLabel`. iOS is in `nativeA11y.ios.ts`.
 */
export function a11yLabel(_label: string): ModifierConfig[] {
  return [];
}
