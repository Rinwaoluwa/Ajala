import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { ActionSheetIOS, Alert, Platform } from 'react-native';

import { useDebouncedValue } from '@shared/hooks/useDebouncedValue';

import { settingsMedia } from '../../settingsModule';
import type { Account, AccountCity, SocialLinks, TravelStyle } from '../../domain/entities/Settings';
import { isSettingsError } from '../../domain/entities/SettingsError';
import {
  BIO_MAX,
  FAVOURITE_CITIES_MAX,
  TRAVEL_STYLES_MAX,
  diffProfile,
  displayNameOf,
  hasChanges,
  isDisplayNameValid,
  isHandleFormatValid,
  normaliseHandle,
  splitDisplayName,
  toggleIn,
} from '../../domain/rules/settingsRules';
import { settingsCopy } from '../copy';
import { settingsKeys } from '../state/settingsQueries';
import { useSettingsUseCases } from '../state/useSettingsUseCases';
import { errorCodeOf, useAccountChanged } from './useSettingsData';

/**
 * View model for Edit profile (API map §10): the form over the account, a live
 * username check (`GET /handles/availability`, after a 400ms pause), the city
 * search (`GET /cities`), favourite destinations (picked from
 * `GET /cities/popular` or searched), the photo (`POST /me/avatar`, saved at
 * once), and Save (`PATCH /me` with only what changed; languages, links, travel
 * styles and favourite city ids merged into extras).
 */
export function useEditProfile(account: Account) {
  const useCases = useSettingsUseCases();
  const queryClient = useQueryClient();
  const accountChanged = useAccountChanged();

  const [displayName, setDisplayName] = useState(displayNameOf(account));
  const [handle, setHandle] = useState(account.handle ?? '');
  const [bio, setBio] = useState(account.bio ?? '');
  const [city, setCity] = useState<AccountCity | null>(account.homeCity);
  const [languages, setLanguages] = useState<string[]>(account.languages);
  const [links, setLinks] = useState<SocialLinks>(account.socialLinks);
  const [travelStyles, setTravelStyles] = useState<TravelStyle[]>(account.travelStyles);
  const [favourites, setFavourites] = useState<AccountCity[]>(account.favouriteCities);

  // ---------- username ----------
  const cleanHandle = normaliseHandle(handle);
  const handleChanged = cleanHandle !== (account.handle ?? '');
  const settledHandle = useDebouncedValue(cleanHandle, 400);
  const handleFormatOk = isHandleFormatValid(cleanHandle);
  const handleCheck = useQuery({
    queryKey: settingsKeys.handle(settledHandle),
    queryFn: () => useCases.checkHandle(settledHandle),
    enabled: handleChanged && isHandleFormatValid(settledHandle),
    staleTime: 60_000,
  });
  const handleStatus: 'unchanged' | 'format' | 'checking' | 'available' | 'taken' | 'reserved' =
    !handleChanged
      ? 'unchanged'
      : !handleFormatOk
        ? 'format'
        : settledHandle !== cleanHandle || handleCheck.isFetching || !handleCheck.data
          ? 'checking'
          : handleCheck.data.available
            ? 'available'
            : handleCheck.data.reason === 'reserved'
              ? 'reserved'
              : 'taken';

  // ---------- city ----------
  const [cityQuery, setCityQuery] = useState('');
  const settledCity = useDebouncedValue(cityQuery.trim(), 300);
  const cities = useQuery({
    queryKey: settingsKeys.cities(settledCity.toLowerCase()),
    queryFn: () => useCases.searchCities(settledCity),
    enabled: settledCity.length >= 2,
    staleTime: 10 * 60_000,
  });

  // ---------- favourite destinations ----------
  const [destQuery, setDestQuery] = useState('');
  const settledDest = useDebouncedValue(destQuery.trim(), 300);
  // Same key as the home-city search: one answer per query, whichever field asked.
  const destinations = useQuery({
    queryKey: settingsKeys.cities(settledDest.toLowerCase()),
    queryFn: () => useCases.searchCities(settledDest),
    enabled: settledDest.length >= 2,
    staleTime: 10 * 60_000,
  });
  const popular = useQuery({
    queryKey: settingsKeys.popularCities,
    queryFn: () => useCases.popularCities(),
    // The server refreshes the list every 10 minutes.
    staleTime: 10 * 60_000,
  });

  // ---------- photo ----------
  const avatar = useMutation({
    mutationFn: (file: { uri: string; name: string; type: string }) => useCases.uploadAvatar(file),
    onSuccess: (avatarUrl) => {
      const current = queryClient.getQueryData<Account>(settingsKeys.account) ?? account;
      accountChanged({ ...current, avatarUrl });
    },
  });
  const [localPhoto, setLocalPhoto] = useState<string | null>(null);

  const pick = useCallback(
    async (source: 'library' | 'camera') => {
      const picked = await settingsMedia.pickSquareImage({ source });
      if (!picked) return;
      setLocalPhoto(picked.uri);
      avatar.mutate(picked, { onError: () => setLocalPhoto(null) });
    },
    [avatar],
  );

  const choosePhoto = useCallback(() => {
    const copy = settingsCopy.edit;
    const options = [copy.library, copy.camera, settingsCopy.hub.cancel];
    const run = (i: number) => {
      if (i === 0) void pick('library');
      else if (i === 1) void pick('camera');
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { title: copy.photoChoice, options, cancelButtonIndex: 2 },
        run,
      );
      return;
    }
    Alert.alert(copy.photoChoice, undefined, [
      { text: copy.library, onPress: () => run(0) },
      { text: copy.camera, onPress: () => run(1) },
      { text: settingsCopy.hub.cancel, style: 'cancel' },
    ]);
  }, [pick]);

  const linkSetters = useMemo(
    () => ({
      instagram: (t: string) => setLinks((l) => ({ ...l, instagram: t })),
      tiktok: (t: string) => setLinks((l) => ({ ...l, tiktok: t })),
      website: (t: string) => setLinks((l) => ({ ...l, website: t })),
    }),
    [],
  );

  // ---------- save ----------
  const { firstName, lastName } = splitDisplayName(displayName);
  const edit = useMemo(
    () =>
      diffProfile(account, {
        firstName,
        lastName,
        handle: cleanHandle,
        bio,
        homeCityId: city?.id ?? null,
        languages,
        socialLinks: links,
        travelStyles,
        favouriteCityIds: favourites.map((c) => c.id),
      }),
    [account, firstName, lastName, cleanHandle, bio, city, languages, links, travelStyles, favourites],
  );
  const save = useMutation({
    mutationFn: () => useCases.saveProfile(account, edit),
    onSuccess: (next) => accountChanged(next),
  });

  const nameOk = isDisplayNameValid(displayName);
  const handleOk = handleStatus === 'unchanged' || handleStatus === 'available';
  const saveError = errorCodeOf(save.error);

  return {
    displayName,
    setDisplayName: useCallback((t: string) => setDisplayName(t), []),
    nameError: displayName.trim() && !nameOk ? settingsCopy.edit.displayNameError : null,
    handle,
    setHandle: useCallback((t: string) => setHandle(t), []),
    handleStatus,
    handleError:
      saveError === 'handleTaken' || saveError === 'handleCooldown'
        ? saveError
        : handleStatus === 'taken' || handleStatus === 'format' || handleStatus === 'reserved'
          ? handleStatus
          : null,
    bio,
    setBio: useCallback((t: string) => setBio(t.slice(0, BIO_MAX)), []),
    city,
    cityQuery,
    setCityQuery: useCallback((t: string) => setCityQuery(t), []),
    cityResults: settledCity.length >= 2 ? (cities.data ?? []) : [],
    citySearching: settledCity.length >= 2 && cities.isFetching,
    chooseCity: (c: AccountCity | null) => {
      setCity(c);
      setCityQuery('');
    },
    languages,
    toggleLanguage: (code: string) => setLanguages((list) => toggleIn(list, code)),
    travelStyles,
    travelStylesFull: travelStyles.length >= TRAVEL_STYLES_MAX,
    toggleTravelStyle: (style: TravelStyle) =>
      setTravelStyles((list) => toggleIn(list, style, TRAVEL_STYLES_MAX)),
    favourites,
    favouritesFull: favourites.length >= FAVOURITE_CITIES_MAX,
    /** Adds the city, or takes it out if already there; a full list takes nothing more. */
    toggleFavourite: (c: AccountCity) =>
      setFavourites((list) =>
        list.some((f) => f.id === c.id)
          ? list.filter((f) => f.id !== c.id)
          : list.length >= FAVOURITE_CITIES_MAX
            ? list
            : [...list, c],
      ),
    destQuery,
    setDestQuery: useCallback((t: string) => setDestQuery(t), []),
    destResults: settledDest.length >= 2 ? (destinations.data ?? []) : [],
    destSearching: settledDest.length >= 2 && destinations.isFetching,
    popularCities: popular.data ?? [],
    links,
    /** One stable setter per link, so the native fields are not rebuilt on each keystroke. */
    linkSetters: linkSetters,
    photoUri: localPhoto ?? account.avatarUrl,
    uploadingPhoto: avatar.isPending,
    photoError: errorCodeOf(avatar.error),
    choosePhoto,
    dirty: hasChanges(edit),
    canSave: hasChanges(edit) && nameOk && handleOk && !save.isPending,
    saving: save.isPending,
    saved: save.isSuccess,
    saveError: saveError && saveError !== 'handleTaken' && saveError !== 'handleCooldown' ? saveError : null,
    /** When the username can change again, only if the server said (it is no longer documented). */
    cooldownUntil: isSettingsError(save.error) ? save.error.availableAt : null,
    save: () => save.mutate(),
  };
}

export type EditProfileViewModel = ReturnType<typeof useEditProfile>;
