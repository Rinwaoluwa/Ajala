import { View } from 'react-native';

import { useTheme } from '@shared/hooks/useTheme';
import { palette } from '@shared/theme';

import { Text } from '../ui/Text';

/**
 * A quiet note: "Safety tip", "Good to know", "Still waiting?", "AJALA
 * passport". A pale card with a teal title — pale in both schemes, as the dark
 * frames draw it, so its text is ink. `tone="accent"` is the Marigold card of
 * the dark Trips frame ("Still waiting?").
 */
export function NoteCard({
  title,
  body,
  tone = 'neutral',
}: {
  title: string;
  body: string;
  tone?: 'neutral' | 'accent';
}) {
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${title}. ${body}`}
      style={{
        borderRadius: 12,
        padding: 16,
        gap: 4,
        backgroundColor: tone === 'accent' ? theme.accent : theme.chipFill,
      }}
    >
      <Text variant="labelSm" style={{ color: tone === 'accent' ? palette.ink : palette.teal }}>
        {title}
      </Text>
      <Text variant="bodySm" style={{ color: theme.chipForeground }}>
        {body}
      </Text>
    </View>
  );
}
