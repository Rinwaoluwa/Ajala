import { TouchableOpacity } from 'react-native';

import { useTheme } from '@shared/hooks/useTheme';

import { GlassSurface } from '../surface/GlassSurface';
import { NativeIcon } from '../ui/NativeIcon';
import { icons } from '../ui/icons';
import { Host } from '../ui/Host';

/**
 * The back button's solid look: the design's mint circle with a teal chevron.
 * `BackButton` uses it on Android, and on iPhones without Liquid Glass (before
 * iOS 26, Reduce Transparency). Its own file, because inside `BackButton.ios.tsx`
 * an import of `./BackButton` resolves back to the iOS file itself.
 */

export const BACK_BUTTON_SIZE = 40;

export type BackButtonProps = {
  onPress: () => void;
  /** Spoken name; "Back" by default. */
  label?: string;
};

export function SolidBackButton({ onPress, label = 'Back' }: BackButtonProps) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID="back-button"
    >
      <GlassSurface
        fallbackColor={theme.selectedFill}
        shadow={false}
        style={{
          width: BACK_BUTTON_SIZE,
          height: BACK_BUTTON_SIZE,
          borderRadius: BACK_BUTTON_SIZE / 2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Host matchContents pointerEvents="none" ignoreSafeArea="all">
          <NativeIcon source={icons.chevronLeft} size={15} color={theme.selectedForeground} />
        </Host>
      </GlassSurface>
    </TouchableOpacity>
  );
}
