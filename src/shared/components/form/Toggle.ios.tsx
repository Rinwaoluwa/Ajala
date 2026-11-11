import { Toggle as SwiftToggle } from '@expo/ui/swift-ui';
import {
  accessibilityLabel as a11yLabel,
  disabled as disabledModifier,
  labelsHidden,
  tint,
} from '@expo/ui/swift-ui/modifiers';

import { useTheme } from '@shared/hooks/useTheme';

import type { ToggleProps } from './Toggle';
import { Host } from '../ui/Host';

/**
 * iOS: SwiftUI's `Toggle` as a switch, its label hidden (the row draws the
 * words) and tinted brand teal when on. The off track is the system's own grey.
 */
export function Toggle({ value, onValueChange, accessibilityLabel, disabled, testID }: ToggleProps) {
  const theme = useTheme();
  return (
    <Host matchContents>
      <SwiftToggle
        isOn={value}
        onIsOnChange={onValueChange}
        label={accessibilityLabel}
        testID={testID}
        modifiers={[
          labelsHidden(),
          tint(theme.primaryFill),
          a11yLabel(accessibilityLabel),
          disabledModifier(disabled ?? false),
        ]}
      />
    </Host>
  );
}
