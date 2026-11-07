import { useCallback, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';

import { DatePickerSheet, icons, NoteCard, SelectField, TextField } from '@shared/components';

import { PLACE_MAX } from '../../../domain/rules/postDraftRules';
import { createPostErrors, issueCopy, kindCopy, wizardCopy } from '../../copy';
import { formatDay, formatTime } from '../../format';
import type { CreatePostViewModel } from '../../hooks/useCreatePost';

import { NotesList } from '../NotesList';
import { RepeatField } from '../RepeatField';
import { StepIntro } from '../StepIntro';

/**
 * Step two, "When and where?": the day and time, the meeting point (an Event's
 * venue), an Event's schedule or a Plan's itinerary, a Group's "Repeats", and a
 * safety tip.
 *
 * The design also draws "Meetup details" and a Group's "Repeat schedule" as free
 * lines. The API has no field for either, so they are not shown: a Group's
 * repeat is the "Repeats" choice instead (`recurrence`).
 *
 * A Meetup puts Date and Time side by side, as drawn, while there is room for
 * both at the current text size; otherwise, and for the other types (which add
 * an end time), they stack.
 */

type Picker = 'date' | 'start' | 'end' | 'endsOn' | null;

const at = (h: number, m = 0) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

export function ScheduleStep({ vm }: { vm: CreatePostViewModel }) {
  const copy = kindCopy[vm.kind].schedule;
  const { draft, update, issues } = vm;
  const [picker, setPicker] = useState<Picker>(null);
  const { width, fontScale } = useWindowDimensions();
  const sideBySide = !copy.endTime && width / Math.max(fontScale, 1) >= 360;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const close = useCallback(() => setPicker(null), []);
  const placeError = vm.placeError ? createPostErrors[vm.placeError.code] : null;

  const dateField = (
    <SelectField
      label={wizardCopy.date}
      value={draft.date ? formatDay(draft.date) : null}
      placeholder={wizardCopy.selectDate}
      icon={icons.calendar}
      onPress={() => setPicker('date')}
      testID="create-date"
    />
  );
  const startField = (
    <SelectField
      label={copy.endTime ? wizardCopy.startTime : wizardCopy.time}
      value={draft.startTime ? formatTime(draft.startTime) : null}
      placeholder={wizardCopy.selectTime}
      icon={icons.clock}
      onPress={() => setPicker('start')}
      error={issues.startTime === 'inPast' ? issueCopy.inPast : null}
      testID="create-start-time"
    />
  );

  return (
    <View style={{ gap: 24 }}>
      <StepIntro heading={copy.heading} body={copy.body} />
      {sideBySide ? (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>{dateField}</View>
          <View style={{ flex: 1 }}>{startField}</View>
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          {dateField}
          {startField}
          {copy.endTime ? (
            <SelectField
              label={wizardCopy.endTime}
              value={draft.endTime ? formatTime(draft.endTime) : null}
              placeholder={wizardCopy.selectTime}
              icon={icons.clock}
              onPress={() => setPicker('end')}
              error={issues.endTime === 'endBeforeStart' ? issueCopy.endBeforeStart : null}
              testID="create-end-time"
            />
          ) : null}
        </View>
      )}
      <TextField
        label={copy.placeLabel}
        placeholder={copy.placePlaceholder}
        defaultValue={draft.place}
        onChangeText={vm.setPlace}
        maxLength={PLACE_MAX}
        autoCapitalize="words"
        error={placeError}
        testID="create-place"
      />
      {copy.lines ? (
        <NotesList
          label={copy.lines.label}
          notes={draft.notes}
          placeholders={copy.lines.placeholders}
          addLabel={copy.lines.add}
          onChange={vm.setNote}
          onRemove={vm.removeNote}
          onMove={vm.moveNote}
          onAdd={vm.addNote}
        />
      ) : null}
      {copy.repeat ? (
        <RepeatField
          value={draft.recurrence}
          onChange={(recurrence) =>
            update(recurrence ? { recurrence } : { recurrence: null, recurrenceEndsOn: null })
          }
          endsOn={draft.recurrenceEndsOn ? formatDay(draft.recurrenceEndsOn) : null}
          onPickEndsOn={() => setPicker('endsOn')}
          onClearEndsOn={() => update({ recurrenceEndsOn: null })}
          error={issues.recurrence ? issueCopy[issues.recurrence] : null}
          endsOnError={issues.recurrenceEndsOn ? issueCopy[issues.recurrenceEndsOn] : null}
        />
      ) : null}
      <NoteCard title={wizardCopy.safetyTip} body={copy.tip} />

      {/* One sheet for every picker: two native sheets side by side fight over presentation. */}
      <DatePickerSheet
        isPresented={picker !== null}
        mode={picker === 'date' || picker === 'endsOn' ? 'date' : 'time'}
        title={
          picker === 'date'
            ? wizardCopy.date
            : picker === 'endsOn'
              ? wizardCopy.repeat.endsOn
              : picker === 'end'
              ? wizardCopy.endTime
              : copy.endTime
                ? wizardCopy.startTime
                : wizardCopy.time
        }
        value={
          picker === 'date'
            ? (draft.date ?? today)
            : picker === 'endsOn'
              ? (draft.recurrenceEndsOn ?? draft.date ?? today)
              : ((picker === 'end' ? draft.endTime : draft.startTime) ?? at(picker === 'end' ? 20 : 18))
        }
        minimumDate={picker === 'date' ? today : picker === 'endsOn' ? (draft.date ?? today) : undefined}
        onConfirm={(value) => {
          update(
            picker === 'date'
              ? { date: value }
              : picker === 'endsOn'
                ? { recurrenceEndsOn: new Date(value.getFullYear(), value.getMonth(), value.getDate()) }
                : picker === 'end'
                  ? { endTime: value }
                  : { startTime: value },
          );
          close();
        }}
        onDismiss={close}
      />
    </View>
  );
}
