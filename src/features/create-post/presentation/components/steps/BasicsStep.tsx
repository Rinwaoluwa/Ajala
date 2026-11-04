import { useCallback } from 'react';
import { View } from 'react-native';

import { NoteCard, TextArea, TextField } from '@shared/components';

import { DESCRIPTION_MAX, TITLE_MAX, needsCity } from '../../../domain/rules/postDraftRules';
import { kindCopy, wizardCopy } from '../../copy';
import type { CreatePostViewModel } from '../../hooks/useCreatePost';
import { CityField } from '../CityField';

import { PhotoGrid } from '../PhotoGrid';

/** Step one, "Basic Details": photos, title, description, and a Plan's or Group's city. */
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
      {needsCity(vm.kind) && copy.city ? (
        <CityField
          label={copy.city.label}
          placeholder={copy.city.placeholder}
          value={draft.city}
          onChange={(city) => update({ city })}
        />
      ) : null}
      {copy.note ? <NoteCard title={copy.note.title} body={copy.note.body} /> : null}
    </View>
  );
}
