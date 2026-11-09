import { Host } from '@expo/ui';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { NativeIcon, NativeSpinner, Text, TextLink, icons } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { layout, palette } from '@shared/theme';

import type { CityDetection } from '../../domain/entities/Profile';
import { setupCopy } from '../copy';

/**
 * "Current city": the pale filled box with a location mark, the city, and
 * "Auto-detected" at the right when it came from the phone.
 *
 * Read-only: the current city is always where the phone is, so there is
 * nothing to tap. When it cannot be found, a line under the box says why and
 * offers the one fix (allow location, open Settings, or try again).
 *
 * Pale in both schemes with ink text, as the dark frame draws it. The box grows
 * with the text size; the city fades in when detection lands.
 */

const input = layout.input;

export type CityFieldProps = {
  label: string | null;
  detected: boolean;
  detecting: boolean;
  /** The last lookup, for why the city is missing. */
  detection: CityDetection | null;
  onFix: () => void;
};

export function CityField({ label, detected, detecting, detection, onFix }: CityFieldProps) {
  const theme = useTheme();
  const copy = setupCopy.basics;
  const problem = !label && !detecting && detection && detection.kind !== 'found' ? missingCopy(detection) : null;
  const text = label ?? (problem ? copy.cityUnknown : copy.cityDetecting);

  return (
    <View style={{ gap: 10 }}>
      <View
        accessible
        accessibilityLabel={`${copy.currentCity}: ${label ?? (problem ? problem.body : copy.cityDetecting)}`}
        style={{
          minHeight: input.heightWithIcon,
          borderWidth: 1,
          borderColor: theme.controlBorder,
          borderRadius: input.radius,
          backgroundColor: theme.chipFill,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 15,
          paddingVertical: 10,
        }}
      >
        <Host matchContents pointerEvents="none" ignoreSafeArea="all">
          <NativeIcon source={icons.location} size={18} color={palette.ink} />
        </Host>
        <Animated.View key={label ?? 'empty'} entering={FadeIn.duration(200)} style={{ flex: 1 }}>
          <Text variant="bodySm" style={{ color: label ? palette.ink : palette.inkSecondary }}>
            {text}
          </Text>
        </Animated.View>
        {detecting && !label ? (
          <Host matchContents>
            <NativeSpinner size={14} color={palette.inkSecondary} />
          </Host>
        ) : detected && label ? (
          <Text variant="bodyXs" style={{ color: palette.inkSecondary }}>
            {copy.autoDetected}
          </Text>
        ) : null}
      </View>

      {problem ? (
        <Animated.View entering={FadeIn.duration(200)} style={{ gap: 6, alignItems: 'flex-start' }}>
          <Text variant="bodySm" tone="muted">
            {problem.body}
          </Text>
          <TextLink label={problem.action} onPress={onFix} emphasis="plain" />
        </Animated.View>
      ) : null}
    </View>
  );
}

function missingCopy(detection: Exclude<CityDetection, { kind: 'found' }>) {
  const missing = setupCopy.basics.cityMissing;
  if (detection.kind === 'notFound') return missing.notFound;
  return detection.blocked ? missing.blocked : missing.noPermission;
}
