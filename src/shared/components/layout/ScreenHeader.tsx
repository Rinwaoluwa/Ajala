import { View } from 'react-native';

import { BackButton, BACK_BUTTON_SIZE } from '../navigation/BackButton';
import { Text } from '../ui/Text';

/**
 * A screen's top bar: the round back button and a title, left-aligned.
 *
 * The back button is the shared `BackButton`: the system's own glass button on
 * iOS 26, the design's mint circle elsewhere, so every screen's way back looks
 * and behaves the same. The title (Plus Jakarta 20/28) starts 12pt after it.
 *
 * Place it inside the safe area; it adds no top inset of its own.
 *
 * The row is a minimum height, not a fixed one: with a larger text-size setting
 * the title grows, and a long title wraps to a second line rather than being cut.
 */

/** Row height: the back button's. */
const ROW_HEIGHT = BACK_BUTTON_SIZE;
/** Exported so a screen without a title can hold the same space open. */
export const SCREEN_HEADER_HEIGHT = ROW_HEIGHT;
const TITLE_GAP = 12;

export type ScreenHeaderProps = {
  title: string;
  onBack?: () => void;
};

export function ScreenHeader({ title, onBack }: ScreenHeaderProps) {
  return (
    <View style={{ minHeight: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: TITLE_GAP }}>
      {onBack ? <BackButton onPress={onBack} /> : null}
      <Text variant="headingMd" accessibilityRole="header" numberOfLines={2} className="flex-1">
        {title}
      </Text>
    </View>
  );
}
