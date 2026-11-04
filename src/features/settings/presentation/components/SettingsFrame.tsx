import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen, ScreenHeader, enterRise } from '@shared/components';
import { SCREEN_GUTTER } from '@shared/theme';

/**
 * Every Settings screen's frame (Figma Settings, Edit profile, Drafts…): "← Title"
 * at the top, then content that scrolls under it — long at large text sizes.
 * The content rises in once (`enterRise`). `footer` stays pinned above the
 * home indicator (a Save button).
 */
export function SettingsFrame({
  title,
  onBack,
  children,
  footer,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Screen edges={['top']} padded={false}>
      <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 8, paddingBottom: 8 }}>
        <ScreenHeader title={title} onBack={onBack} />
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: 16,
          paddingBottom: footer ? 24 : Math.max(insets.bottom, 16) + 24,
          gap: 28,
        }}
      >
        <Animated.View entering={enterRise(40)} style={{ gap: 28 }}>
          {children}
        </Animated.View>
      </ScrollView>
      {footer ? (
        <View
          style={{
            paddingHorizontal: SCREEN_GUTTER,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 16),
          }}
        >
          {footer}
        </View>
      ) : null}
    </Screen>
  );
}
