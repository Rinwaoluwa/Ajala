import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '@shared/components';
import { layout } from '@shared/theme';

/**
 * The frame every setup screen shares: a fixed header, and content that scrolls
 * beneath it — the chip lists are long, and at large text sizes everything is.
 * Measured on the frames: the heading starts 28pt under the indicator.
 *
 * `fill`: no scrolling; the content is laid out in the screen's own height, so
 * a part of it can take what is left (`flex: 1`), as the travel styles do.
 */

export const SECTION_GAP = 28;

export function SetupScreen({
  header,
  children,
  fill = false,
}: {
  header: ReactNode;
  children: ReactNode;
  fill?: boolean;
}) {
  const insets = useSafeAreaInsets();
  if (fill) {
    return (
      <Screen edges={['top']} padded={false}>
        {header}
        <View
          style={{
            flex: 1,
            paddingHorizontal: layout.screenGutter,
            paddingTop: SECTION_GAP,
            paddingBottom: Math.max(insets.bottom, 16) + 16,
          }}
        >
          {children}
        </View>
      </Screen>
    );
  }
  return (
    <Screen edges={['top']} padded={false}>
      {header}
      <ScrollView
        // Android draws scrolled content past the edges unless told to clip, over the header above.
        style={{ flex: 1, overflow: 'hidden' }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{
          paddingHorizontal: layout.screenGutter,
          paddingTop: SECTION_GAP,
          paddingBottom: Math.max(insets.bottom, 16) + 16,
        }}
      >
        {children}
      </ScrollView>
    </Screen>
  );
}
