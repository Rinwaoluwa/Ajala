import { useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import { useFontScale } from '@shared/hooks/useFontScale';

/**
 * A row of items that scrolls sideways only when it has to — the filter pills,
 * the map's type chips.
 *
 * While the items fit, they are laid out in a plain row; once they are wider
 * than the space (five pills on a phone, any row at a large text size), the
 * same row moves into a horizontal scroll view. This is not only tidier: Liquid
 * Glass inside a horizontal scroll view on a screen opened after launch does
 * not draw, so keeping rows that fit out of one keeps their glass.
 */
export function ScrollRow({
  children,
  gap = 8,
  inset = 0,
  accessibilityRole,
}: {
  children: ReactNode;
  gap?: number;
  /** Side padding, inside the scrolling area. */
  inset?: number;
  accessibilityRole?: 'tablist' | 'radiogroup';
}) {
  const fontScale = useFontScale();
  const [space, setSpace] = useState(0);
  const [content, setContent] = useState(0);
  const overflows = space > 0 && content > space + 1;

  const row = (
    <View
      onLayout={(e) => setContent(e.nativeEvent.layout.width)}
      accessibilityRole={overflows ? undefined : accessibilityRole}
      // Sized to its items, so its width says whether they fit.
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        gap,
        paddingHorizontal: inset,
        paddingVertical: 2,
      }}
    >
      {children}
    </View>
  );

  return (
    // Remeasured from scratch when the text size changes while the app is open: the old
    // measurements would otherwise keep the pills at their previous height and clip the text.
    <View key={fontScale} onLayout={(e) => setSpace(e.nativeEvent.layout.width)}>
      {overflows ? (
        <ScrollView
          horizontal
          // The items' shadows reach past the row; clipped, they end in a hard line.
          style={{ overflow: 'visible' }}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          accessibilityRole={accessibilityRole}
        >
          {row}
        </ScrollView>
      ) : (
        row
      )}
    </View>
  );
}
