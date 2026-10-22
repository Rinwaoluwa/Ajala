import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button, Chip, ChipGroup, Text, enterRise } from '@shared/components';

import { TRAVEL_STYLES, toggle } from '../../domain/rules/profileSetupRules';
import { chipToneFor } from '../chipTones';
import { SetupHeader } from '../components/SetupHeader';
import { SetupIntro } from '../components/SetupIntro';
import { SECTION_GAP, SetupScreen } from '../components/SetupScreen';
import { setupCopy } from '../copy';
import { useProfileSetup } from '../state/ProfileSetupContext';

/**
 * "How do you like to travel?", step 2 of 4. Any number of styles; Continue
 * once there is one.
 *
 * Not saved: the backend has no field for travel styles yet (API map §12). The
 * choices live in the setup draft and go when it does, as agreed with product.
 */
export function TravelStyleScreen({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) {
  const { draft, update } = useProfileSetup();
  const copy = setupCopy.travelStyle;

  return (
    <SetupScreen header={<SetupHeader step={1} onBack={onBack} />}>
      <SetupIntro title={copy.title} body={copy.body} />
      <Animated.View entering={enterRise(80)} style={{ marginTop: SECTION_GAP }}>
        <Text variant="bodyMd" className="mb-12">
          {copy.section}
        </Text>
        <ChipGroup>
          {TRAVEL_STYLES.map((style) => (
            <Chip
              key={style}
              label={style}
              selected={draft.travelStyles.includes(style)}
              tone={chipToneFor(style)}
              onPress={() => update({ travelStyles: toggle(draft.travelStyles, style) })}
            />
          ))}
        </ChipGroup>
      </Animated.View>
      <View style={{ marginTop: 36 }}>
        <Button
          label={setupCopy.continue}
          size="lg"
          fullWidth
          disabled={draft.travelStyles.length === 0}
          onPress={onContinue}
          testID="setup-travel-continue"
        />
      </View>
    </SetupScreen>
  );
}
