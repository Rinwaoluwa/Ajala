import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button, Chip, ChipGroup, LoadingRing, Text, TextLink, enterRise } from '@shared/components';
import { palette } from '@shared/theme';

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

const BADGE = 24;

function EmojiBadge({ emoji }: { emoji: string | null }) {
  return (
    <View
      style={{
        width: BADGE,
        height: BADGE,
        borderRadius: BADGE / 2,
        backgroundColor: palette.white,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text variant="bodyXs" allowFontScaling={false} style={{ fontSize: 14, lineHeight: 18 }}>
        {emoji ?? '\u2728'}
      </Text>
    </View>
  );
}

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
    <SetupScreen header={<SetupHeader step={3} onBack={onBack} />}>
      <SetupIntro title={copy.title} body={copy.body} />

      <View style={{ marginTop: SECTION_GAP, minHeight: 120 }}>
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
        ) : (
          <Animated.View entering={enterRise(0)}>
            <ChipGroup gap={8} rowGap={24}>
              {(vm.interests ?? []).map((interest) => (
                <Chip
                  key={interest.id}
                  label={interest.name}
                  leading={<EmojiBadge emoji={interest.emoji} />}
                  selected={vm.selected.includes(interest.id)}
                  disabled={vm.full}
                  tone={chipToneFor(interest.slug)}
                  onPress={() => vm.choose(interest.id)}
                />
              ))}
            </ChipGroup>
          </Animated.View>
        )}
      </View>

      <View style={{ marginTop: 36 }}>
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
