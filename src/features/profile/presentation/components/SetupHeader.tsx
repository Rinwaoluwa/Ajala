import { View, useColorScheme } from 'react-native';

import { SCREEN_HEADER_HEIGHT, ScreenHeader, StepProgress } from '@shared/components';

import { setupCopy } from '../copy';
import { SETUP_STEPS } from '../navigation/routes';

/**
 * The top of a numbered setup step: "← Back" and the four-segment indicator
 * 12pt below. The first step has no back arrow; its space is held so the
 * indicator sits where it does on every other step.
 *
 * The current segment is teal on light and Marigold on dark, as the setup frames
 * draw it — the opposite of the headings, which go the other way.
 */
export function SetupHeader({ step, onBack }: { step: number; onBack?: () => void }) {
  const dark = useColorScheme() === 'dark';
  return (
    <View className="px-20">
      {onBack ? (
        <ScreenHeader title={setupCopy.back} onBack={onBack} />
      ) : (
        <View style={{ height: SCREEN_HEADER_HEIGHT }} />
      )}
      <View className="mt-12">
        <StepProgress count={SETUP_STEPS} current={step} tone={dark ? 'accent' : 'primary'} />
      </View>
    </View>
  );
}
