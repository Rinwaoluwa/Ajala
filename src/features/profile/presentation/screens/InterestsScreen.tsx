import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button, Chip, EmojiBadge, enterRise, FittedChips, LoadingRing, Text, TextLink } from '@shared/components';

import { chipToneFor } from '../chipTones';
import { SetupHeader } from '../components/SetupHeader';
import { SetupIntro } from '../components/SetupIntro';
import { SECTION_GAP, SetupScreen } from '../components/SetupScreen';
import { setupCopy } from '../copy';
import { useInterests } from '../hooks/useInterests';

/**
 * "What are you into?", step 4 of 4: five to eight of the server's interests
 * (`PATCH /me { interestIds }` at the end of setup). Skip is allowed.
 *
 * The design pictures each interest with a small photo; the API gives an emoji,
 * so the chip shows that in a white disc of the same size (agreed with product).
 * These chips are the taller pill, 8pt apart in rows 24pt apart, as drawn.
 */


export function InterestsScreen({
  onBack,
  onContinue,
  onSkip,
}: {
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
}) {
  const vm = useInterests();
  const copy = setupCopy.interests;

  return (
    <SetupScreen fill header={<SetupHeader step={3} onBack={onBack} />}>
      <SetupIntro title={copy.title} body={copy.body} />

      {/* Every interest listed, wrapping onto rows that fill the screen and scroll up and
          down (never sideways), with a search above (`FittedChips`). */}
      <View style={{ marginTop: SECTION_GAP, minHeight: 120, flex: 1 }}>
        {vm.loading ? (
          <View className="items-center py-32">
            <LoadingRing size={36} accessibilityLabel="Loading interests" />
          </View>
        ) : vm.failed ? (
          <Animated.View entering={FadeIn.duration(200)} className="items-center py-24">
            <Text variant="bodySm" tone="muted" className="text-center">
              {copy.loadFailed}
            </Text>
            <View className="mt-12">
              <TextLink label={copy.retry} onPress={vm.retry} emphasis="plain" />
            </View>
          </Animated.View>
        ) : !vm.interests?.length ? (
          // The server has none to offer yet: say so, and Skip carries on.
          <Animated.View entering={FadeIn.duration(200)} className="items-center py-24">
            <Text variant="bodySm" tone="muted" className="text-center">
              {copy.none}
            </Text>
          </Animated.View>
        ) : (
          <Animated.View entering={enterRise(0)} style={{ flex: 1 }}>
            <FittedChips
              items={vm.interests}
              keyOf={(interest) => interest.id}
              labelOf={(interest) => interest.name}
              isSelected={(interest) => vm.selected.includes(interest.id)}
              searchPlaceholder={copy.search}
              noMatches={copy.noMatches}
              gap={8}
              rowGap={14}
              renderChip={(interest) => (
                <Chip
                  label={interest.name}
                  leading={<EmojiBadge emoji={interest.emoji} />}
                  selected={vm.selected.includes(interest.id)}
                  disabled={vm.full}
                  tone={chipToneFor(interest.slug)}
                  onPress={() => vm.choose(interest.id)}
                />
              )}
            />
          </Animated.View>
        )}
      </View>

      <View style={{ marginTop: 20 }}>
        <Button
          label={setupCopy.continue}
          size="lg"
          fullWidth
          disabled={!vm.canContinue}
          onPress={() => {
            vm.keep();
            onContinue();
          }}
          testID="setup-interests-continue"
        />
      </View>
      <View className="mt-16 items-center">
        <TextLink
          label={setupCopy.skip}
          tone="foreground"
          emphasis="plain"
          onPress={() => {
            vm.skip();
            onSkip();
          }}
          testID="setup-interests-skip"
        />
      </View>
    </SetupScreen>
  );
}
