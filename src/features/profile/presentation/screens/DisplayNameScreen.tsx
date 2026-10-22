import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import {
  Button,
  NativeIcon,
  NativeSpinner,
  ScreenHeader,
  Text,
  TextField,
  enterRise,
  icons,
} from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { layout } from '@shared/theme';

import { AllSetSheet } from '../components/AllSetSheet';
import { RadioOption } from '../components/RadioOption';
import { SetupIntro } from '../components/SetupIntro';
import { SECTION_GAP, SetupScreen } from '../components/SetupScreen';
import { setupCopy } from '../copy';
import { useDisplayName } from '../hooks/useDisplayName';
import { useProfileSetup } from '../state/ProfileSetupContext';

/**
 * "Choose your display name" (Figma, empty and filled; light and dark), under
 * "Set up your preferences".
 *
 * The field shows "@" before the handle once there is one, a spinner while it is
 * being checked and a green check when it is free. The design's "Label" radio
 * rows are filled with suggestions from the person's name.
 *
 * Continue goes to biometric sign-in where the phone has it; where it does not,
 * this screen ends setup itself with "You're all set!".
 */

export type DisplayNameScreenProps = {
  onBack: () => void;
  /** Called after the handle is saved. Return false to end setup here instead. */
  onChosen: () => boolean;
  allSet: { isPresented: boolean; onStart: () => void; present: () => void };
};

export function DisplayNameScreen({ onBack, onChosen, allSet }: DisplayNameScreenProps) {
  const theme = useTheme();
  const { profile } = useProfileSetup();
  const vm = useDisplayName({
    onChosen: () => {
      if (!onChosen()) allSet.present();
    },
  });
  const copy = setupCopy.displayName;

  const trailing =
    vm.status.kind === 'checking' ? (
      <NativeSpinner size={14} color={theme.muted} />
    ) : vm.status.kind === 'available' ? (
      <NativeIcon source={icons.check} size={16} color={theme.success} />
    ) : undefined;

  return (
    <View style={{ flex: 1 }}>
      <SetupScreen
        header={
          <View className="px-20">
            <ScreenHeader title={copy.header} onBack={onBack} />
          </View>
        }
      >
        <SetupIntro title={copy.title} body={copy.body} />

        <Animated.View entering={enterRise(60)} style={{ marginTop: SECTION_GAP }}>
          <TextField
            key={vm.fieldKey}
            label={copy.label}
            placeholder={copy.placeholder}
            defaultValue={vm.value}
            prefix={vm.value ? '@' : undefined}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username-new"
            maxLength={21}
            returnKeyType="done"
            onChangeText={vm.change}
            onSubmitEditing={vm.canSubmit ? vm.submit : undefined}
            error={vm.fieldError}
            trailing={trailing}
            testID="display-name-field"
          />
          {vm.status.kind === 'available' && !vm.fieldError ? (
            <Text variant="bodyXs" tone="success" className="mt-4" accessibilityLiveRegion="polite">
              {copy.available}
            </Text>
          ) : null}
        </Animated.View>

        {vm.suggestions.length > 0 ? (
          <Animated.View
            entering={FadeIn.duration(200)}
            className="mt-8"
            accessibilityRole="radiogroup"
            accessibilityLabel={copy.suggestions}
          >
            {vm.suggestions.map((handle) => (
              <RadioOption
                key={handle}
                label={handle}
                selected={vm.value === handle}
                onPress={() => vm.pickSuggestion(handle)}
              />
            ))}
          </Animated.View>
        ) : null}

        <View style={{ marginTop: 20 }}>
          <Button
            label={setupCopy.continue}
            size="lg"
            fullWidth
            disabled={!vm.canSubmit}
            loading={vm.submitting}
            onPress={vm.submit}
            testID="display-name-continue"
          />
          <Text variant="bodySm" tone="muted" className="mt-20 text-center">
            {copy.later}
          </Text>
        </View>
        <View style={{ height: layout.screenGutter }} />
      </SetupScreen>
      <AllSetSheet
        isPresented={allSet.isPresented}
        firstName={profile?.firstName ?? null}
        onStart={allSet.onStart}
      />
    </View>
  );
}
