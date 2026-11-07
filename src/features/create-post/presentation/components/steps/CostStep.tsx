import { Text as ExpoText } from '@expo/ui';
import { useCallback } from 'react';
import { View } from 'react-native';

import { icons, NoteCard, SelectField, TextField } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { textStyles } from '@shared/theme';

import { needsExternalUrl, parseWhole, previewEach, sharesCost } from '../../../domain/rules/postDraftRules';
import { issueCopy, kindCopy, wizardCopy } from '../../copy';
import { formatMoney } from '../../format';
import type { CreatePostViewModel } from '../../hooks/useCreatePost';
import { CostCard } from '../CostCard';
import { EstimateCard } from '../EstimateCard';

import { StepIntro } from '../StepIntro';

/**
 * Step four, cost (Figma Cost Sharing / Ticketing and cost).
 *
 * A Plan or Group can show a total estimated cost and how many it is split
 * between (`costTotalCents`, `costCurrency`, `expectedCount`). The server works
 * out each share; the "About N each" here is a preview, labelled as one.
 *
 * A Meetup or Event is free or has a price per person (`priceCents`). The API
 * refuses a shared cost on either, so the design's shared cost for a Meetup is
 * asked as a price per person instead. A paid Event needs a link to pay or book
 * (not drawn; the API requires it). The others may add one.
 *
 * An Event's capacity is shown as drawn, and tapping it goes back to set it.
 */
export function CostStep({ vm }: { vm: CreatePostViewModel }) {
  const theme = useTheme();
  const copy = kindCopy[vm.kind].cost;
  const { draft, update, issues } = vm;
  const isEvent = vm.kind === 'event';
  const split = sharesCost(vm.kind);
  const each = previewEach(draft);
  const people = parseWhole(draft.expected);

  const setAmount = useCallback((amount: string) => update({ amount }), [update]);
  const setExpected = useCallback((expected: string) => update({ expected }), [update]);
  const setLink = useCallback((externalUrl: string) => update({ externalUrl }), [update]);

  return (
    <View style={{ gap: 24 }}>
      <StepIntro heading={copy.heading} body={copy.body} />
      <CostCard
        title={copy.toggleTitle}
        body={copy.toggleBody}
        on={draft.costOn}
        onToggle={(costOn) => update({ costOn })}
        currency={draft.currency}
        onCurrency={(currency) => update({ currency })}
        amount={draft.amount}
        onAmount={setAmount}
        error={issues.amount && issues.amount !== 'required' ? issueCopy[issues.amount] : null}
      />

      {isEvent ? (
        <SelectField
          label={wizardCopy.capacity}
          value={draft.capacity === null ? wizardCopy.noLimit : wizardCopy.peopleCount(draft.capacity)}
          placeholder={wizardCopy.noLimit}
          icon={icons.chevronLeft}
          onPress={() => vm.goToStep('participants')}
        />
      ) : draft.costOn && split && copy.expectedLabel ? (
        <TextField
          label={copy.expectedLabel}
          defaultValue={draft.expected}
          onChangeText={setExpected}
          keyboardType="number-pad"
          maxLength={6}
          trailing={
            <ExpoText
              textStyle={{
                fontFamily: textStyles.bodySm.fontFamily,
                fontSize: textStyles.bodySm.fontSize,
                color: theme.muted,
              }}
            >
              {wizardCopy.people}
            </ExpoText>
          }
          error={issues.expected === 'expectedRange' ? issueCopy.expectedRange : null}
          testID="create-expected"
        />
      ) : null}

      {draft.costOn && each !== null ? (
        !split ? (
          <EstimateCard
            label={wizardCopy.entryCost}
            amount={wizardCopy.perPerson(formatMoney(each, draft.currency))}
            body={wizardCopy.shownBeforeJoin}
          />
        ) : people !== null && copy.estimateBody ? (
          <EstimateCard
            label={wizardCopy.estimatedSplit}
            amount={wizardCopy.about(formatMoney(each, draft.currency))}
            body={copy.estimateBody(people)}
          />
        ) : null
      ) : null}

      {draft.costOn ? (
        <TextField
          label={needsExternalUrl(draft) ? wizardCopy.linkLabel : wizardCopy.linkLabelOptional}
          placeholder={wizardCopy.linkPlaceholder}
          defaultValue={draft.externalUrl}
          onChangeText={setLink}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          error={issues.externalUrl === 'notHttps' ? issueCopy.notHttps : null}
          testID="create-link"
        />
      ) : null}

      <NoteCard title={copy.noteTitle} body={copy.noteBody} />
    </View>
  );
}
