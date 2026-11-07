import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActionSheetIOS, Alert, Platform } from 'react-native';

import type { Gender } from '../../domain/entities/Profile';
import {
  MAX_LANGUAGES,
  NAME_MAX,
  canContinueBasics,
  isFullNameValid,
  toggle,
} from '../../domain/rules/profileSetupRules';
import { profileMedia } from '../../profileModule';
import { setupCopy } from '../copy';
import { useProfileSetup } from '../state/ProfileSetupContext';

/**
 * View model for "Set up your profile" (step 1 of 4).
 *
 * Continue needs a city and at least one language — plus a name and a date of
 * birth for the accounts that arrive without them (Google, Apple). Gender is
 * offered but optional (spec §2.4, §8.1). The photo is optional and uploads on
 * its own.
 */
export function useProfileBasics() {
  const { draft, update, missing, avatar, uploadAvatar, removeAvatar, detectingCity, detectCity, profile } =
    useProfileSetup();
  const [nameTouched, setNameTouched] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Wait for the profile: a city it already has must not be looked up again.
  useEffect(() => {
    if (profile && !draft.homeCity) detectCity();
  }, [profile, draft.homeCity, detectCity]);

  const toggleLanguage = useCallback(
    (code: string) => update({ languages: toggle(draft.languages, code, MAX_LANGUAGES) }),
    [draft.languages, update],
  );
  const chooseGender = useCallback((gender: Gender) => update({ gender }), [update]);
  const changeName = useCallback((fullName: string) => update({ fullName }), [update]);
  const blurName = useCallback(() => setNameTouched(true), []);

  const nameError =
    missing.name && nameTouched && draft.fullName.trim() !== '' && !isFullNameValid(draft.fullName)
      ? `Enter your first and last name, up to ${NAME_MAX} characters each.`
      : null;

  const pick = useCallback(
    async (source: 'library' | 'camera') => {
      const file = await profileMedia.pickSquareImage({ source });
      if (file) await uploadAvatar(file);
    },
    [uploadAvatar],
  );

  /** The platform's own chooser: an action sheet on iOS, a dialog on Android. */
  const choosePhoto = useCallback(() => {
    const copy = setupCopy.basics.photoSheet;
    const hasPhoto = avatar.uri !== null;
    const options = [copy.library, copy.camera, ...(hasPhoto ? [copy.remove] : []), copy.cancel];
    const run = (index: number) => {
      if (index === 0) void pick('library');
      else if (index === 1) void pick('camera');
      else if (hasPhoto && index === 2) void removeAvatar();
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: copy.title,
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: hasPhoto ? 2 : undefined,
        },
        run,
      );
      return;
    }
    Alert.alert(copy.title, undefined, [
      { text: copy.library, onPress: () => run(0) },
      { text: copy.camera, onPress: () => run(1) },
      ...(hasPhoto
        ? [
            {
              text: copy.remove,
              style: 'destructive' as const,
              onPress: () => run(2),
            },
          ]
        : []),
      { text: copy.cancel, style: 'cancel' as const },
    ]);
  }, [avatar.uri, pick, removeAvatar]);

  const canContinue = useMemo(
    () =>
      canContinueBasics(
        {
          homeCityId: draft.homeCity?.id ?? null,
          languages: draft.languages,
          gender: draft.gender,
          fullName: draft.fullName,
          dateOfBirth: draft.dateOfBirth,
        },
        missing,
      ),
    [draft, missing],
  );

  return {
    ready: profile !== null,
    draft,
    missing,
    avatar,
    detectingCity,
    nameError,
    canContinue,
    toggleLanguage,
    chooseGender,
    changeName,
    blurName,
    choosePhoto,
    datePicker: {
      isPresented: pickerOpen,
      open: () => setPickerOpen(true),
      close: () => setPickerOpen(false),
      confirm: (date: Date) => {
        setPickerOpen(false);
        update({ dateOfBirth: toCalendarDate(date) });
      },
    },
  };
}

/** YYYY-MM-DD in the phone's own calendar day, as `dob` takes it. */
export function toCalendarDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
