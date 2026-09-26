import { Host } from '@expo/ui';
import { View } from 'react-native';

import { useTheme } from '@shared/hooks/useTheme';
import { layout } from '@shared/theme';

import { icons } from '../ui/icons';
import { NativeIcon } from '../ui/NativeIcon';
import { Text } from '../ui/Text';

/**
 * A live checklist of password requirements under a password field.
 *
 * From the Create Account design: one 20pt row per rule, a 12pt round mark and
 * Inter 12/16 text. An unmet rule's mark is grey; a met rule's turns Marigold, the
 * brand's "validation met" colour. The text stays muted either way; the mark
 * alone carries the state.
 *
 * Each row is announced with its state, so a screen reader user hears "Minimum of
 * 8 characters, met" rather than a colour they cannot see.
 */

const rules = layout.passwordRules;

export type PasswordRule = { id: string; label: string; met: boolean };

export type PasswordRulesProps = {
  rules: PasswordRule[];
};

export function PasswordRules({ rules: items }: PasswordRulesProps) {
  const theme = useTheme();

  return (
    <View style={{ marginTop: rules.offsetTop }}>
      {items.map((rule) => (
        <View
          key={rule.id}
          accessible
          accessibilityLabel={`${rule.label}, ${rule.met ? 'met' : 'not met'}`}
          style={{ height: rules.rowHeight, flexDirection: 'row', alignItems: 'center', gap: rules.markGap }}
        >
          <Host matchContents>
            <NativeIcon
              source={icons.checkCircle}
              size={rules.markSize}
              color={rule.met ? theme.accent : theme.track}
            />
          </Host>
          <Text variant="bodyXs" tone="muted">
            {rule.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
