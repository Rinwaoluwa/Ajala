import { useCallback } from 'react';
import { View } from 'react-native';

import { NoteCard, TextArea, TextField } from '@shared/components';

import { DESCRIPTION_MAX, TITLE_MAX, needsDestination } from '../../../domain/rules/postDraftRules';
import { kindCopy, wizardCopy } from '../../copy';
import type { CreatePostViewModel } from '../../hooks/useCreatePost';
import { PhotoGrid } from '../PhotoGrid';
import { PlaceField } from '../PlaceField';

/**
 * Step one, "Basic Details": photos, title, description, and a Plan's or
 * Group's destination, a city searched with Google (sent as its place id).
 */
export function BasicsStep({ vm }: { vm: CreatePostViewModel }) {
  const copy = kindCopy[vm.kind].basics;
  const { update, draft } = vm;
  const setTitle = useCallback((title: string) => update({ title }), [update]);
  const setDescription = useCallback((description: string) => update({ description }), [update]);

  return (
    <View style={{ gap: 24 }}>
      <PhotoGrid
        photos={draft.photos}
        onAdd={() => void vm.addPhotos()}
        onRemove={vm.removePhoto}
        onMove={vm.movePhoto}
      />
      <TextField
        label={wizardCopy.title}
        placeholder={copy.titlePlaceholder}
        defaultValue={draft.title}
        onChangeText={setTitle}
        maxLength={TITLE_MAX}
        autoCapitalize="sentences"
        helper={`${draft.title.length}/${TITLE_MAX}`}
        testID="create-title"
      />
      <TextArea
        label={wizardCopy.description}
        placeholder={copy.descriptionPlaceholder}
        defaultValue={draft.description}
        onChangeText={setDescription}
        maxLength={DESCRIPTION_MAX}
        helper={`${draft.description.length}/${DESCRIPTION_MAX}`}
        testID="create-description"
      />
      {needsDestination(vm.kind) && copy.destination ? (
        <PlaceField
          kind="cities"
          label={copy.destination.label}
          placeholder={copy.destination.placeholder}
          value={draft.destination}
          onPick={(destination) => update({ destination })}
          onClear={() => update({ destination: null })}
          testID="create-destination"
        />
      ) : null}
      {copy.note ? <NoteCard title={copy.note.title} body={copy.note.body} /> : null}
    </View>
  );
}
