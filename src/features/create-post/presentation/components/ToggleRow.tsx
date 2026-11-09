import { View } from 'react-native';

import { Text, Toggle } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

/**
 * A setting in a card: title, muted line, and a switch at the right ("Anyone can
 * join", "Show on map", "Waiting list"). The text wraps beside the
 * switch at any text size. `divider` draws the hairline above it.
 */
export function ToggleRow({
  title,
  body,
  value,
  onChange,
  divider = false,
  testID,
}: {
  title: string;
  body: string;
  value: boolean;
  onChange: (value: boolean) => void;
  divider?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: divider ? 1 : 0,
        borderTopColor: theme.border,
      }}
    >
      <View
        style={{ flex: 1, gap: 2 }}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <Text variant="bodyMd">{title}</Text>
        <Text variant="bodySm" tone="muted">
          {body}
        </Text>
      </View>
      <Toggle
        value={value}
        onValueChange={onChange}
        accessibilityLabel={`${title}. ${body}`}
        testID={testID}
      />
    </View>
  );
}

/** The rounded, outlined card toggle rows sit in. */
export function SettingsCard({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View
      style={{
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.card,
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  );
}
