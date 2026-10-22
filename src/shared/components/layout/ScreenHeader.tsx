import { Button as ExpoButton, Host } from '@expo/ui';
import { View } from 'react-native';

import { useTheme } from '@shared/hooks/useTheme';

import { icons } from '../ui/icons';
import { a11yLabel } from '../ui/nativeA11y';
import { NativeIcon } from '../ui/NativeIcon';
import { NATIVE_BUTTON_INSET } from '../ui/nativeButtonInset';
import { Text } from '../ui/Text';

/**
 * A screen's top bar: a back arrow and a title, left-aligned.
 *
 * From the Create Account design: the arrow sits just inside the 20pt gutter, the
 * title in Plus Jakarta 20/28 starts about 26pt after it, and the row is centred 15pt
 * below the status bar. The back button is a native Expo UI button, so press
 * feedback and VoiceOver ("Back, button") are the platform's own.
 *
 * Place it inside the safe area; it adds no top inset of its own.
 *
 * The row is a minimum height, not a fixed one: with a larger text-size setting
 * the title grows, and a long title wraps to a second line rather than being cut.
 */

/** Row height, so the row centre lands where the design puts it. */
const ROW_HEIGHT = 30;
/** Exported so a screen without a title can hold the same space open. */
export const SCREEN_HEADER_HEIGHT = ROW_HEIGHT;
/** Padding around the arrow: a larger tap target without moving the glyph. */
const ARROW_PAD = 4;
/** SF Symbols `arrow.left` at 18pt draws the 16pt-wide arrow in the design. */
const ARROW_SIZE = 18;
/** Measured: the arrow glyph starts 7pt inside the gutter, the title 69pt from the edge. */
const ARROW_INSET = 1;
const TITLE_GAP = 22;

export type ScreenHeaderProps = {
  title: string;
  onBack?: () => void;
};

export function ScreenHeader({ title, onBack }: ScreenHeaderProps) {
  const theme = useTheme();

  return (
    <View style={{ minHeight: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center' }}>
      {onBack ? (
        <Host
          matchContents
          // The native button's own content padding (Android) comes off both sides so
          // the arrow and title stay where the design puts them.
          style={{
            marginLeft: ARROW_INSET - NATIVE_BUTTON_INSET,
            marginRight: TITLE_GAP - ARROW_PAD - NATIVE_BUTTON_INSET,
          }}
        >
          <ExpoButton
            variant="text"
            onPress={onBack}
            modifiers={a11yLabel('Back')}
            style={{ padding: ARROW_PAD }}
            testID="screen-header-back"
          >
            <NativeIcon source={icons.back} size={ARROW_SIZE} color={theme.foreground} />
          </ExpoButton>
        </Host>
      ) : null}
      <Text variant="headingMd" accessibilityRole="header" numberOfLines={2} className="flex-1">
        {title}
      </Text>
    </View>
  );
}
