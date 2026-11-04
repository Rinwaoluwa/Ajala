import { Host } from '@expo/ui';
import { useCallback } from 'react';
import { TouchableOpacity, View } from 'react-native';

import { NativeIcon, SortableGrid, Text, TextField, icons } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

import type { DraftNote } from '../../domain/entities/PostDraft';
import { NOTE_MAX, NOTES_MAX } from '../../domain/rules/postDraftRules';
import { wizardCopy } from '../copy';

/**
 * The step-two list: "Meetup details", "Event schedule", "Itinerary", "Repeat
 * schedule". One line per row with the grip at its left — hold and drag to move
 * it — and a × to remove it; "+ Add another detail" below. The first two rows'
 * placeholders are the design's examples ("Doors open", "Main event").
 *
 * A Plan's lines are sent as its checklist; see the feature README for the rest.
 */

export type NotesListProps = {
  label: string;
  notes: DraftNote[];
  placeholders: [string, string];
  addLabel: string;
  onChange: (key: string, text: string) => void;
  onRemove: (key: string) => void;
  onMove: (from: number, to: number) => void;
  onAdd: () => void;
};

export function NotesList({
  label,
  notes,
  placeholders,
  addLabel,
  onChange,
  onRemove,
  onMove,
  onAdd,
}: NotesListProps) {
  const theme = useTheme();
  return (
    <View>
      <Text variant="labelXs" tone="muted">
        {label}
      </Text>
      <View className="mt-8">
        <SortableGrid
          items={notes}
          keyOf={(n) => n.key}
          columns={1}
          gap={10}
          onMove={onMove}
          itemLabel={(i) => wizardCopy.noteItem(i + 1)}
          renderItem={(note, index) => (
            <NoteRow
              note={note}
              index={index}
              placeholder={placeholders[index] ?? ''}
              label={label}
              onChange={onChange}
              onRemove={onRemove}
            />
          )}
        />
      </View>
      {notes.length < NOTES_MAX ? (
        <TouchableOpacity
          activeOpacity={0.6}
          onPress={onAdd}
          accessibilityRole="button"
          hitSlop={6}
          style={{
            marginTop: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            alignSelf: 'flex-start',
          }}
        >
          <Host matchContents pointerEvents="none" ignoreSafeArea="all">
            <NativeIcon source={icons.add} size={16} color={theme.primary} />
          </Host>
          <Text variant="labelMd" tone="primary">
            {addLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function NoteRow({
  note,
  index,
  placeholder,
  label,
  onChange,
  onRemove,
}: {
  note: DraftNote;
  index: number;
  placeholder: string;
  label: string;
  onChange: (key: string, text: string) => void;
  onRemove: (key: string) => void;
}) {
  const theme = useTheme();
  const { key } = note;
  const change = useCallback((text: string) => onChange(key, text), [onChange, key]);
  return (
    <TextField
      label={`${label}, ${wizardCopy.noteItem(index + 1)}`}
      labelHidden
      placeholder={placeholder}
      defaultValue={note.text}
      onChangeText={change}
      maxLength={NOTE_MAX}
      leading={<NativeIcon source={icons.dragHandle} size={14} color={theme.placeholder} />}
      trailing={<NativeIcon source={icons.close} size={12} color={theme.muted} />}
      trailingAction={{ onPress: () => onRemove(key), accessibilityLabel: wizardCopy.removeNote(index + 1) }}
    />
  );
}
