import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '@shared/components';
import { layout } from '@shared/theme';

/**
 * The frame every setup screen shares: a fixed header, and content that scrolls
 * beneath it — the chip lists are long, and at large text sizes everything is.
 * Measured on the frames: the heading starts 28pt under the indicator.
 */

export const SECTION_GAP = 28;

export function SetupScreen({ header, children }: { header: ReactNode; children: ReactNode }) {
  const insets = useSafeAreaInsets();
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
