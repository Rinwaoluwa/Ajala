import { Image } from 'expo-image';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button, Chip, ChipGroup, EmojiBadge, SkeletonBlock, SkeletonPulse, Text, TextLink } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

import { priceOf, startOf, stepIssues, stepOfField, stepsFor } from '../../../domain/rules/postDraftRules';
import { fieldNames, kindCopy, wizardCopy } from '../../copy';
import { formatMoney, formatShortDay, formatTime } from '../../format';
import type { CreatePostViewModel } from '../../hooks/useCreatePost';
import { StepIntro } from '../StepIntro';

/**
 * The last step, "Review your …": the post as travellers will see it (cover,
 * title, "Lagos · 22 Oct · 5:30 PM", description), the summary rows, then
 * Publish in coral. The price row is there only when there is a price, as on a
 * card: a skipped price is not "Free", it is simply not said. A Plan has none.
 *
 * Interests are required to publish but in no wizard of the design (API map
 * §12), so they are asked for here, 1 to 3. Anything else still missing is
 * listed above Publish with a link to its step — along with whatever the server
 * turned down, if a Publish came back with a validation error, each linked to
 * the step that holds its field (`errors[].field`).
 */
export function ReviewStep({ vm }: { vm: CreatePostViewModel }) {
  const theme = useTheme();
  const kind = kindCopy[vm.kind];
  const copy = kind.review;
  const participants = kind.participants;
  const { draft } = vm;
  const start = startOf(draft);
  const price = priceOf(draft);
  const link = draft.externalUrl.trim();
  const where = draft.destination?.name ?? draft.place.trim();
  const meta = [where, start ? formatShortDay(start) : null, start ? formatTime(start) : null]
    .filter(Boolean)
    .join(' · ');
  const cover = draft.photos[0];

  const rows: [string, string][] = [
    [
      copy.peopleLabel,
      draft.capacity === null ? wizardCopy.noLimitPeople : wizardCopy.peopleCount(draft.capacity),
    ],
    [
      wizardCopy.joinSetting,
      draft.visibility === 'open' ? participants.openTitle : participants.privateTitle,
    ],
    ...(copy.priceLabel && price !== null
      ? [[copy.priceLabel, wizardCopy.perPerson(formatMoney(price, draft.currency))] as [string, string]]
      : []),
    ...(copy.priceLabel && link ? [[wizardCopy.link, link] as [string, string]] : []),
    [
      wizardCopy.venue,
      draft.place.trim() || draft.destination?.address || draft.destination?.name || '—',
    ],
  ];

  // Everything not ready, step by step (the review step's own — interests — is shown in place).
  const missing = stepsFor(vm.kind).filter((s) => s !== 'review').flatMap((s) =>
    Object.keys(stepIssues(draft, s)).map((field) => ({ step: s, field: field as keyof typeof fieldNames })),
  );
  const serverErrors =
    vm.outcome.kind === 'failed' && vm.outcome.error.code === 'invalid' ? vm.outcome.error.fieldErrors : [];

  return (
    <View style={{ gap: 20 }}>
      <StepIntro heading={copy.heading} body={vm.mode === 'edit' ? wizardCopy.edit.reviewBody : copy.body} />

      <View
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.card,
          padding: 12,
          gap: 10,
        }}
      >
        {cover ? (
          <Image
            source={{ uri: cover.uri }}
            style={{ width: '100%', aspectRatio: 16 / 7, borderRadius: 10 }}
            contentFit="cover"
            transition={200}
            accessibilityIgnoresInvertColors
          />
        ) : null}
        <View style={{ gap: 4, paddingHorizontal: 4, paddingBottom: 4 }}>
          <Text variant="headingSm">{draft.title.trim()}</Text>
          {meta ? (
            <Text variant="bodySm" tone="muted">
              {meta}
            </Text>
          ) : null}
          {draft.description.trim() ? <Text variant="bodySm">{draft.description.trim()}</Text> : null}
        </View>
      </View>

      <View style={{ gap: 14 }}>
        {rows.map(([label, value]) => (
          <View key={label} style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 2 }}>
            <Text variant="bodySm" tone="muted" style={{ flexGrow: 1 }}>
              {label}
            </Text>
            <Text variant="bodySm" style={{ flexShrink: 1, textAlign: 'right' }}>
              {value}
            </Text>
          </View>
        ))}
      </View>

      <Interests vm={vm} />

      {missing.length > 0 || serverErrors.length > 0 ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          accessibilityLiveRegion="polite"
          style={{ borderRadius: 12, padding: 16, gap: 8, backgroundColor: theme.dangerSoft }}
        >
          <Text variant="labelSm" style={{ color: theme.danger }}>
            {wizardCopy.fixFirst}
          </Text>
          {missing.map(({ step, field }) => (
            <View key={field} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text variant="bodySm" style={{ flex: 1, color: theme.chipForeground }}>
                {field === 'place'
                  ? wizardCopy.venue
                  : field === 'destination'
                    ? (kind.basics.destination?.label ?? fieldNames.destination)
                    : field === 'notes'
                      ? (kind.schedule.lines?.label ?? fieldNames.notes)
                      : fieldNames[field]}
              </Text>
              <TextLink label={wizardCopy.goFix} onPress={() => vm.goToStep(step)} emphasis="plain" />
            </View>
          ))}
          {serverErrors.map((e) => {
            const step = stepOfField(e.field, vm.kind);
            return (
              <View
                key={`${e.field}-${e.message}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Text variant="bodySm" style={{ flex: 1, color: theme.chipForeground }}>
                  {e.message}
                </Text>
                {step === 'review' ? null : (
                  <TextLink label={wizardCopy.goFix} onPress={() => vm.goToStep(step)} emphasis="plain" />
                )}
              </View>
            );
          })}
        </Animated.View>
      ) : null}

      <Button
        label={vm.mode === 'edit' ? wizardCopy.edit.save : copy.publish}
        variant="cta"
        size="lg"
        fullWidth
        onPress={vm.publish}
        disabled={!vm.canPublish}
        loading={vm.publishing}
        testID="create-publish"
      />
    </View>
  );
}

function Interests({ vm }: { vm: CreatePostViewModel }) {
  const full = vm.draft.interestIds.length >= 3;
  return (
    <View style={{ gap: 8 }}>
      <Text variant="labelXs" tone="muted">
        {wizardCopy.interests.label}
      </Text>
      <Text variant="bodySm" tone="muted">
        {wizardCopy.interests.hint}
      </Text>
      {vm.interestsFailed ? (
        <Text variant="bodySm" tone="destructive" accessibilityLiveRegion="polite">
          {`${wizardCopy.interests.failed} `}
          <Text variant="bodySm" tone="link" onPress={vm.retryInterests} accessibilityRole="link">
            {wizardCopy.interests.retry}
          </Text>
        </Text>
      ) : !vm.interests ? (
        <SkeletonPulse>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[88, 64, 104, 76, 92].map((w) => (
              <SkeletonBlock key={w} width={w} height={32} radius={16} />
            ))}
          </View>
        </SkeletonPulse>
      ) : (
        <Animated.View entering={FadeIn.duration(200)}>
          <ChipGroup>
            {vm.interests.map((interest) => {
              const selected = vm.draft.interestIds.includes(interest.id);
              return (
                <Chip
                  key={interest.id}
                  // The emoji in its own badge, not in the label: as text it made Android
                  // break "⚽ Sports" over two lines.
                  label={interest.name}
                  leading={<EmojiBadge emoji={interest.emoji} />}
                  selected={selected}
                  disabled={full && !selected}
                  onPress={() => vm.chooseInterest(interest.id)}
                />
              );
            })}
          </ChipGroup>
        </Animated.View>
      )}
    </View>
  );
}
