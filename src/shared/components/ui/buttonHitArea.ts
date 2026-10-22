import type { ModifierConfig } from '@expo/ui/swift-ui/modifiers';

/**
 * Extra modifiers that make the whole button tappable.
 *
 * Android and web need none: Compose's button puts its `clickable` on the whole
 * surface. iOS does — see `buttonHitArea.ios.ts`.
 */
export function buttonHitArea(_radius: number): ModifierConfig[] {
  return [];
}
