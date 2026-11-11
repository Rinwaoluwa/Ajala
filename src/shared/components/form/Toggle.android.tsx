import { Switch } from '@expo/ui/jetpack-compose';
import { semantics, testID as testIDModifier } from '@expo/ui/jetpack-compose/modifiers';

import { useTheme } from '@shared/hooks/useTheme';
import { palette } from '@shared/theme';

import type { ToggleProps } from './Toggle';
import { Host } from '../ui/Host';

/**
 * Android: Compose's Material 3 `Switch`, coloured as the design draws it — a
 * teal track with a white thumb when on, a pale mint track when off.
 */
export function Toggle({ value, onValueChange, accessibilityLabel, disabled, testID }: ToggleProps) {
  const theme = useTheme();
  return (
    <Host matchContents>
      <Switch
        value={value}
        onCheckedChange={onValueChange}
        enabled={!disabled}
        colors={{
          checkedTrackColor: theme.primaryFill,
          checkedThumbColor: palette.white,
          checkedBorderColor: theme.primaryFill,
          uncheckedTrackColor: theme.selectedFill,
          uncheckedThumbColor: palette.white,
          uncheckedBorderColor: theme.selectedFill,
        }}
        modifiers={[
          semantics({ contentDescription: accessibilityLabel }),
          ...(testID ? [testIDModifier(testID)] : []),
        ]}
      />
    </Host>
  );
}
