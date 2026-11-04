import { Switch } from 'react-native';

import { useTheme } from '@shared/hooks/useTheme';

/**
 * An on/off switch: "Anyone can join", "Show on map", "Total estimated cost".
 *
 * The platform's own switch, tinted to the brand: teal when on. iOS
 * (`Toggle.ios.tsx`) is SwiftUI's `Toggle`, Android (`Toggle.android.tsx`) is
 * Compose's `Switch`; this file holds the props and the web fallback.
 *
 * It draws no label: the row around it does, and passes the same words as
 * `accessibilityLabel` so the switch reads out what it turns on.
 */

export type ToggleProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
  testID?: string;
};

export function Toggle({ value, onValueChange, accessibilityLabel, disabled, testID }: ToggleProps) {
  const theme = useTheme();
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      trackColor={{ true: theme.primaryFill, false: theme.selectedFill }}
      testID={testID}
    />
  );
}
