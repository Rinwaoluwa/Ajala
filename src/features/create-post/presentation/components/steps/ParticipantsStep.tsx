import { View } from 'react-native';

import { NoteCard } from '@shared/components';

import { clampCapacity, stepCapacity } from '../../../domain/rules/postDraftRules';
import { kindCopy, wizardCopy } from '../../copy';
import type { CreatePostViewModel } from '../../hooks/useCreatePost';
import { CapacityStepper } from '../CapacityStepper';

import { StepIntro } from '../StepIntro';
import { SettingsCard, ToggleRow } from '../ToggleRow';

/**
 * Step three, "Who can join?": capacity, then how people join.
 *
 * "Anyone can join" and "Request to join" are the two answers to one question
 * (`visibility`: open or private), so turning one on turns the other off. The
 * waiting list is not drawn but the API has it (API map §5: "worth a toggle").
 *
 * Not built: "Invite friends". There are no friends or invites in the API yet
 * (API map §12); a published post's link can be shared instead.
 */
export function ParticipantsStep({ vm }: { vm: CreatePostViewModel }) {
  const copy = kindCopy[vm.kind].participants;
  const { draft, update } = vm;
  const open = draft.visibility === 'open';
  const hint =
    vm.kind === 'event'
      ? wizardCopy.eventCapacityHint
      : vm.kind === 'group'
        ? wizardCopy.groupCapacityHint
        : null;

  return (
    <View style={{ gap: 24 }}>
      <StepIntro heading={copy.heading} body={copy.body} />
      <CapacityStepper
        label={copy.capacityLabel}
        value={draft.capacity}
        onStep={(delta) => update({ capacity: stepCapacity(vm.kind, draft.capacity, delta) })}
        onType={(capacity) => update({ capacity })}
        onCommit={() => update({ capacity: clampCapacity(vm.kind, draft.capacity) })}
        hint={hint}
      />
      <SettingsCard>
        <ToggleRow
          title={copy.openTitle}
          body={copy.openBody}
          value={open}
          onChange={(on) => update({ visibility: on ? 'open' : 'private' })}
        />
        <ToggleRow
          title={copy.privateTitle}
          body={copy.privateBody}
          value={!open}
          onChange={(on) => update({ visibility: on ? 'private' : 'open' })}
          divider
        />
        <ToggleRow
          title={wizardCopy.showOnMapTitle}
          body={wizardCopy.showOnMapBody}
          value={draft.showOnMap}
          onChange={(showOnMap) => update({ showOnMap })}
          divider
        />
        {draft.capacity !== null ? (
          <ToggleRow
            title={wizardCopy.waitlistTitle}
            body={wizardCopy.waitlistBody}
            value={draft.waitlist}
            onChange={(waitlist) => update({ waitlist })}
            divider
          />
        ) : null}
      </SettingsCard>
      <NoteCard title={wizardCopy.safetyTip} body={copy.tip} />
    </View>
  );
}
