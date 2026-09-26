import { accessibilityLabel, type ModifierConfig } from '@expo/ui/swift-ui/modifiers';

/**
 * iOS: an accessibility label for an Expo UI control whose content says nothing
 * useful out loud, such as an icon-only button. VoiceOver would otherwise read the
 * SF Symbol's own name ("left arrow").
 */
export function a11yLabel(label: string): ModifierConfig[] {
  return [accessibilityLabel(label)];
}
