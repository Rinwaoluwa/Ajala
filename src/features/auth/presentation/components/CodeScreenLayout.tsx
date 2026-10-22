import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen, ScreenHeader } from '@shared/components';
import { layout } from '@shared/theme';

/**
 * The frame for a Verification screen outside sign-up — step-up during sign-in
 * and linking Google or Apple: a titled back bar, then the code form.
 *
 * Measured to match the Sign In screen it follows: the heading sits where it
 * does on the stepped screens, so the space the step indicator would take is
 * held open below the bar.
 */

/** The header row plus the 15pt the step indicator occupies on the stepped screens. */
const HEADER_GAP = 28 + 15;

export type CodeScreenLayoutProps = {
  headerTitle: string;
  onBack: () => void;
  children: ReactNode;
};

export function CodeScreenLayout({ headerTitle, onBack, children }: CodeScreenLayoutProps) {
  const insets = useSafeAreaInsets();
  return (
    <Screen edges={['top']} padded={false}>
      <View className="px-20">
        <ScreenHeader title={headerTitle} onBack={onBack} />
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{
          paddingHorizontal: layout.screenGutter,
          paddingTop: HEADER_GAP,
          paddingBottom: Math.max(insets.bottom, 16) + 16,
        }}
      >
        {children}
      </ScrollView>
    </Screen>
  );
}
