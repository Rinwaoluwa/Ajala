import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActionSheetIOS, Alert, Platform } from 'react-native';

import { useDebouncedValue } from '@shared/hooks/useDebouncedValue';

import { settingsMedia } from '../../settingsModule';
import type { Account, AccountPlace, SocialLinks, TravelStyle } from '../../domain/entities/Settings';
import { isSettingsError } from '../../domain/entities/SettingsError';
import {
  BIO_MAX,
  FAVOURITE_DESTINATIONS_MAX,
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
 * username check (`GET /handles/availability`, after a 400ms pause), the home
 * city (where the phone is, looked up on open; it cannot be picked by hand)
 * and favourite destinations (a Google cities search, since the API has none,
 * with a few well-known cities as quick searches), the photo (`POST /me/avatar`, saved at once), and Save
 * (`PATCH /me` with only what changed: `homePlaceId`, and languages, links,
 * travel styles and `favouriteDestinationIds` merged into extras).
 */
export function useEditProfile(account: Account) {
  const useCases = useSettingsUseCases();
  const queryClient = useQueryClient();
  const accountChanged = useAccountChanged();

  const [displayName, setDisplayName] = useState(displayNameOf(account));
  const [handle, setHandle] = useState(account.handle ?? '');
  const [bio, setBio] = useState(account.bio ?? '');
  const [languages, setLanguages] = useState<string[]>(account.languages);
  const [links, setLinks] = useState<SocialLinks>(account.socialLinks);
  const [travelStyles, setTravelStyles] = useState<TravelStyle[]>(account.travelStyles);
  const [favourites, setFavourites] = useState<AccountPlace[]>(account.favouriteDestinations);

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

  // ---------- city and favourite destinations ----------
  // The current city is where the phone is: looked up once on open, saved if it moved.
  const detected = useQuery({
    queryKey: settingsKeys.currentCity,
    queryFn: () => useCases.detectCurrentCity(),
    staleTime: 5 * 60_000,
  });
  const city: AccountPlace | null = detected.data ?? account.homePlace;
  const destSearch = useCitySearchField();
  // The destinations field keeps its own text: a new key empties it, or fills it with a quick search.
  const [destField, setDestField] = useState({ key: 0, text: '' });
  // Leaving the screen ends the Google search session; nothing here asks for place details.
  const { endCitySearch } = useCases;
  useEffect(() => () => endCitySearch(), [endCitySearch]);

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
        homePlaceId: city?.placeId ?? null,
        languages,
        socialLinks: links,
        travelStyles,
        favouriteDestinationIds: favourites.map((c) => c.placeId),
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
    cityDetecting: detected.isFetching,
    cityDetected: !!detected.data && detected.data.placeId === city?.placeId,
    languages,
    toggleLanguage: (code: string) => setLanguages((list) => toggleIn(list, code)),
    travelStyles,
    travelStylesFull: travelStyles.length >= TRAVEL_STYLES_MAX,
    toggleTravelStyle: (style: TravelStyle) =>
      setTravelStyles((list) => toggleIn(list, style, TRAVEL_STYLES_MAX)),
    favourites,
    favouritesFull: favourites.length >= FAVOURITE_DESTINATIONS_MAX,
    /** Adds the city, or takes it out if already there; a full list takes nothing more (an 11th is a 400). */
    toggleFavourite: (c: AccountPlace) =>
      setFavourites((list) =>
        list.some((f) => f.placeId === c.placeId)
          ? list.filter((f) => f.placeId !== c.placeId)
          : list.length >= FAVOURITE_DESTINATIONS_MAX
            ? list
            : [...list, { placeId: c.placeId, name: c.name, label: c.label }],
      ),
    destField,
    destQuery: destSearch.query,
    setDestQuery: destSearch.setQuery,
    destResults: destSearch.results,
    destSearching: destSearch.searching,
    destFailure: destSearch.failure,
    destNoMatches: destSearch.noMatches,
    /** A quick search: put the city's name in the field and search for it. */
    searchDestination: (name: string) => {
      destSearch.setQuery(name);
      setDestField((f) => ({ key: f.key + 1, text: name }));
    },
    /** Managing closed: empty the field and end the Google session. */
    closeDestinations: () => {
      destSearch.setQuery('');
      setDestField((f) => ({ key: f.key + 1, text: '' }));
      endCitySearch();
    },
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

/**
 * One city search field: Google cities (through the use cases), asked once
 * typing pauses for 300ms and from two characters, since each request is
 * billed. A newer query cancels the one in flight (TanStack's `signal`), and
 * only the answer for what is in the field now shows. Not retried: when Google
 * is unreachable a second try fails the same way, and the field says so.
 * Both fields share one cache, so a city searched in one is instant in the other.
 */
function useCitySearchField() {
  const useCases = useSettingsUseCases();
  const [query, setQuery] = useState('');
  const q = query.trim();
  const settled = useDebouncedValue(q, 300);
  const result = useQuery({
    queryKey: settingsKeys.cities(settled.toLowerCase()),
    queryFn: ({ signal }) => useCases.searchCities(settled, signal),
    enabled: settled.length >= 2,
    staleTime: 10 * 60_000,
    retry: false,
  });
  const asking = q.length >= 2;
  const current = asking && settled === q && !result.isFetching;
  return {
    query,
    setQuery: useCallback((t: string) => setQuery(t), []),
    results: current ? (result.data ?? []) : [],
    searching: asking && !current,
    failure: current && result.isError ? errorCodeOf(result.error) : null,
    noMatches: current && result.isSuccess && result.data.length === 0,
  };
}
