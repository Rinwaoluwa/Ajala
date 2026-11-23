import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button, Chip, ChipGroup, EmojiBadge, LoadingRing, Text, TextLink } from '@shared/components';
import { useFontScale } from '@shared/hooks/useFontScale';
import { useTheme } from '@shared/hooks/useTheme';
import { textStyles } from '@shared/theme';

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

/** An interest chip: 8pt above and below its emoji badge (24pt) or its label, whichever is taller. */
const CHIP_PAD = 16;
const CHIP_BADGE = 24;
const CHIP_ROWS = 3;
const CHIP_ROW_GAP = 8;

function Interests({ vm }: { vm: CreatePostViewModel }) {
  const full = vm.draft.interestIds.length >= 3;
  // The height of the three rows the chips sit in, for the loader that holds their place.
  const chip = CHIP_PAD + Math.max(CHIP_BADGE, Math.ceil(textStyles.bodySm.lineHeight * useFontScale()));
  const chipsHeight = chip * CHIP_ROWS + CHIP_ROW_GAP * (CHIP_ROWS - 1);
  // The chips come a moment after the step. Some forty of them are slow to draw, and drawn
  // with the step they held up everything else on it: the Publish button came up only once
  // they had, a second or more late on a slow phone. Until they are in, the loader has their place.
  const [stepDrawn, setStepDrawn] = useState(false);
  useEffect(() => {
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setStepDrawn(true));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, []);
  const interests = stepDrawn ? vm.interests : null;
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
      ) : (
        // One loader for the whole wait: while the list is fetched, and for the moment its
        // chips take to be laid out in their rows (a long list is not instant on a slow phone).
        // It keeps the height the three rows of chips will have, so Publish does not move
        // when they arrive.
        <ChipGroup
          loading={!interests}
          placeholder={
            // As tall as the chips will be; the ring and its words sit at the top of that,
            // where the first row of chips comes in, not adrift in the middle of it.
            <View
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={wizardCopy.interests.loading}
              accessibilityLiveRegion="polite"
              style={{ minHeight: chipsHeight }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: chip }}>
                <LoadingRing size={28} accessibilityLabel={wizardCopy.interests.loading} />
                <Text variant="bodySm" tone="muted" style={{ flexShrink: 1 }}>
                  {wizardCopy.interests.loading}
                </Text>
              </View>
            </View>
          }
        >
          {(interests ?? []).map((interest) => {
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
      )}
    </View>
  );
}
