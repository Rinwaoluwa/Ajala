import { View } from 'react-native';

import { Text } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

/**
 * An Event's running order or a Plan's itinerary: a heading like "Who's Going",
 * then the lines in the page's pale card. A Plan's stops are numbered in mint
 * squares (they go in order); an Event's lines get a mint dot, since they
 * usually carry their own times ("6:00 PM Doors open"). Each line wraps, so it
 * reads at any text size.
 */
export function LineList({
  title,
  lines,
  numbered,
  lineLabel,
}: {
  title: string;
  lines: string[];
  numbered: boolean;
  /** Read out before each line ("Stop 2 of 5"). */
  lineLabel?: (n: number, of: number) => string;
}) {
  const theme = useTheme();
  if (!lines.length) return null;
  return (
    <View style={{ gap: 12 }}>
      <Text variant="headingMd" accessibilityRole="header">
        {title}
      </Text>
      <View style={{ borderRadius: 16, padding: 14, gap: 12, backgroundColor: theme.surfaceMuted }}>
        {lines.map((line, i) => (
          <View
            key={`${i}-${line}`}
            accessible
            accessibilityLabel={lineLabel ? `${lineLabel(i + 1, lines.length)}: ${line}` : line}
            style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}
          >
            {numbered ? (
              <View
                style={{
                  minWidth: 28,
                  minHeight: 28,
                  paddingHorizontal: 6,
                  borderRadius: 8,
                  backgroundColor: theme.selectedFill,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text variant="labelSm" style={{ color: theme.selectedForeground }}>
                  {i + 1}
                </Text>
              </View>
            ) : (
              // Centred on the first line of text at any size: the row lines up on the text's top.
              <View style={{ paddingTop: 7 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.selectedForeground }} />
              </View>
            )}
            <Text variant="bodyMd" style={{ flex: 1, paddingTop: numbered ? 3 : 0 }}>
              {line}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
