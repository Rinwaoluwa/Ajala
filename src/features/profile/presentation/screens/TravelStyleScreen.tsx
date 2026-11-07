import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button, Chip, ChipGroup, Text, enterRise } from '@shared/components';

import { MAX_TRAVEL_STYLES, TRAVEL_STYLES, toggle } from '../../domain/rules/profileSetupRules';
import { chipToneFor } from '../chipTones';
import { SetupHeader } from '../components/SetupHeader';
import { SetupIntro } from '../components/SetupIntro';
import { SECTION_GAP, SetupScreen } from '../components/SetupScreen';
import { setupCopy } from '../copy';
import { useProfileSetup } from '../state/ProfileSetupContext';

/**
 * "How do you like to travel?", step 2 of 4. Up to ten styles (the API's cap on
 * `extras.travelStyles`), with the count beside the heading; once ten are
 * chosen the rest dim until one is let go. Continue once there is one.
 *
 * The choices are held in the setup draft and saved with the rest of setup
 * (one `PATCH /me`), as the API's slugs.
 */
export function TravelStyleScreen({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) {
  const { draft, update } = useProfileSetup();
  const copy = setupCopy.travelStyle;
  const chosen = draft.travelStyles;
  const full = chosen.length >= MAX_TRAVEL_STYLES;

  return (
    <SetupScreen header={<SetupHeader step={1} onBack={onBack} />}>
      <SetupIntro title={copy.title} body={copy.body} />
      <Animated.View entering={enterRise(80)} style={{ marginTop: SECTION_GAP }}>
        <View className="mb-12 flex-row items-baseline justify-between">
          <Text variant="bodyMd">{copy.section}</Text>
          <Text
            variant="bodyXs"
            tone="muted"
            accessibilityLabel={`${chosen.length} of ${MAX_TRAVEL_STYLES} chosen`}
          >
            {`${chosen.length}/${MAX_TRAVEL_STYLES}`}
          </Text>
        </View>
        <ChipGroup>
          {TRAVEL_STYLES.map((style) => (
            <Chip
              key={style.value}
              label={style.label}
              selected={chosen.includes(style.value)}
              disabled={full}
              tone={chipToneFor(style.label)}
              onPress={() => update({ travelStyles: toggle(chosen, style.value, MAX_TRAVEL_STYLES) })}
            />
          ))}
        </ChipGroup>
      </Animated.View>
      <View style={{ marginTop: 36 }}>
        <Button
          label={setupCopy.continue}
          size="lg"
          fullWidth
          disabled={chosen.length === 0}
          onPress={onContinue}
          testID="setup-travel-continue"
        />
      </View>
    </SetupScreen>
  );
}
