import { useCallback } from 'react';
import { View } from 'react-native';

import { icons, NoteCard, SelectField, TextField } from '@shared/components';

import { priceOf } from '../../../domain/rules/postDraftRules';
import { issueCopy, kindCopy, wizardCopy } from '../../copy';
import { formatMoney } from '../../format';
import type { CreatePostViewModel } from '../../hooks/useCreatePost';
import { EstimateCard } from '../EstimateCard';
import { PriceCard } from '../PriceCard';
import { StepIntro } from '../StepIntro';

/**
 * Step four for a Meetup, Event or Group: an optional price per person
 * (`priceCents` + `currency`) and an optional link to pay or book
 * (`externalUrl`). Both may be left out, a paid Event's link included (backend
 * answers C1/C2), and "Skip" at the foot moves on with neither. A post with no
 * price shows no price at all, not "Free".
 *
 * There is no shared cost: it left the API, so nothing here splits a total.
 * A Plan never reaches this step — Plans carry no money.
 *
 * An Event's capacity is shown as drawn, and tapping it goes back to set it.
 */
export function PriceStep({ vm }: { vm: CreatePostViewModel }) {
  const copy = kindCopy[vm.kind].price;
  const { draft, update, issues } = vm;
  const price = priceOf(draft);

  const setAmount = useCallback((value: string) => update({ price: value }), [update]);
  const setLink = useCallback((externalUrl: string) => update({ externalUrl }), [update]);

  // The wizard has no price step for a Plan; this only guards against a wrong call.
  if (!copy) return null;

  return (
    <View style={{ gap: 24 }}>
      <StepIntro heading={copy.heading} body={vm.mode === 'edit' ? wizardCopy.edit.priceBody : copy.body} />
      {/* A live post's price cannot change (the API refuses it), so editing one shows it fixed. */}
      {vm.mode === 'edit' ? (
        <NoteCard
          title={price !== null ? wizardCopy.perPerson(formatMoney(price, draft.currency)) : wizardCopy.edit.noPrice}
          body={wizardCopy.edit.priceFixed}
        />
      ) : (
        <PriceCard
          label={copy.priceLabel}
          currency={draft.currency}
          onCurrency={(currency) => update({ currency })}
          amount={draft.price}
          onAmount={setAmount}
          error={issues.price ? issueCopy[issues.price] : null}
        />
      )}

      {price !== null && vm.mode !== 'edit' ? (
        <EstimateCard
          label={wizardCopy.entryCost}
          amount={wizardCopy.perPerson(formatMoney(price, draft.currency))}
          body={wizardCopy.shownBeforeJoin}
        />
      ) : null}

      <TextField
        label={wizardCopy.linkLabel}
        placeholder={wizardCopy.linkPlaceholder}
        defaultValue={draft.externalUrl}
        onChangeText={setLink}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        error={issues.externalUrl === 'notHttps' ? issueCopy.notHttps : null}
        testID="create-link"
      />

      {vm.kind === 'event' ? (
        <SelectField
          label={wizardCopy.capacity}
          value={draft.capacity === null ? wizardCopy.noLimit : wizardCopy.peopleCount(draft.capacity)}
          placeholder={wizardCopy.noLimit}
          icon={icons.chevronLeft}
          onPress={() => vm.goToStep('participants')}
        />
      ) : null}

      <NoteCard title={copy.noteTitle} body={copy.noteBody} />
    </View>
  );
}
