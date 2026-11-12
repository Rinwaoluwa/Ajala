import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActionSheetIOS, Alert, Platform } from 'react-native';

import { getLocationPermission, openAppSettings } from '@core/location/deviceLocation';
import { useDebouncedValue } from '@shared/hooks/useDebouncedValue';

import { settingsMedia } from '../../settingsModule';
import type {
  Account,
  AccountPlace,
  Interest,
  ProfilePhoto,
  SocialLinks,
  TravelStyle,
} from '../../domain/entities/Settings';
import { isSettingsError } from '../../domain/entities/SettingsError';
import {
  BIO_MAX,
  FAVOURITE_DESTINATIONS_MAX,
  INTERESTS_MAX,
  PHOTOS_MAX,
  TRAVEL_STYLES_MAX,
  interestsCountOk,
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
 * with a few well-known cities as quick searches), the photo (`POST /me/avatar`, saved at once),
 * the gallery (`POST`/`DELETE /me/photos`, each saved at once), the interests
 * (`GET /interests`, 3–8 of them), and Save (`PATCH /me` with only what changed:
 * `homePlaceId`, `interestIds`, and languages, links, travel styles and
 * `favouriteDestinationIds` merged into extras).
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
  const [interestIds, setInterestIds] = useState<string[]>(account.interests.map((i) => i.id));

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
  // `checkFailed`: the lookup itself failed. Save stays open and the server decides,
  // rather than leaving the field on "Checking…" with no way forward.
  const handleStatus:
    | 'unchanged'
    | 'format'
    | 'checking'
    | 'checkFailed'
    | 'available'
    | 'taken'
    | 'reserved' = !handleChanged
    ? 'unchanged'
    : !handleFormatOk
      ? 'format'
      : settledHandle === cleanHandle && !handleCheck.isFetching && handleCheck.isError
        ? 'checkFailed'
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
  // Why there is no city: location refused for good means only Settings can fix it.
  const permission = useQuery({
    queryKey: [...settingsKeys.currentCity, 'permission'],
    queryFn: () => getLocationPermission(),
    enabled: !city && !detected.isFetching,
    staleTime: 0,
  });
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

  // ---------- gallery ----------
  // Each change is saved at once and written into the account the screen reads.
  const latest = useCallback(
    () => queryClient.getQueryData<Account>(settingsKeys.account) ?? account,
    [queryClient, account],
  );
  const addPhoto = useMutation({
    mutationFn: (file: { uri: string; name: string; type: string }) => useCases.addPhoto(file, latest()),
    onSuccess: (photo) => {
      const current = latest();
      accountChanged({ ...current, photos: [...current.photos, photo] });
    },
  });
  const removePhoto = useMutation({
    mutationFn: (photo: ProfilePhoto) => useCases.removePhoto(photo.id),
    onSuccess: (_void, photo) => {
      const current = latest();
      accountChanged({ ...current, photos: current.photos.filter((p) => p.id !== photo.id) });
    },
  });
  // A new order shows at once and is saved straight away; a refusal puts the old one back.
  const reorderPhotos = useMutation({
    mutationFn: (ids: string[]) => useCases.reorderPhotos(ids),
    onMutate: (ids) => {
      const current = latest();
      const byId = new Map(current.photos.map((p) => [p.id, p]));
      const photos = ids.map((id) => byId.get(id)).filter((p): p is ProfilePhoto => !!p);
      queryClient.setQueryData<Account>(settingsKeys.account, { ...current, photos });
      return { before: current.photos };
    },
    onSuccess: (photos) => accountChanged({ ...latest(), photos }),
    onError: (_e, _ids, context) => {
      if (context) queryClient.setQueryData<Account>(settingsKeys.account, { ...latest(), photos: context.before });
    },
  });
  const movePhoto = useCallback(
    (from: number, to: number) => {
      const ids = latest().photos.map((p) => p.id);
      if (from === to || from < 0 || to < 0 || from >= ids.length || to >= ids.length) return;
      const [moved] = ids.splice(from, 1);
      ids.splice(to, 0, moved);
      reorderPhotos.mutate(ids);
    },
    [latest, reorderPhotos],
  );
  const [uploadingPhotos, setUploadingPhotos] = useState(0);
  const addPhotos = useCallback(async () => {
    const room = PHOTOS_MAX - latest().photos.length;
    if (room <= 0) return;
    const picked = await settingsMedia.pickImages({ limit: room, maxEdge: 1600 });
    if (!picked.length) return;
    setUploadingPhotos(picked.length);
    try {
      // One at a time: the server numbers them in arrival order, and a refusal stops the rest.
      for (const file of picked) {
        await addPhoto.mutateAsync(file).catch(() => undefined);
        setUploadingPhotos((n) => n - 1);
      }
    } finally {
      setUploadingPhotos(0);
    }
  }, [addPhoto, latest]);

  // ---------- interests ----------
  const interests = useQuery({
    queryKey: settingsKeys.interests,
    queryFn: () => useCases.listInterests(),
    staleTime: 60 * 60_000,
  });

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
        interestIds,
      }),
    [account, firstName, lastName, cleanHandle, bio, city, languages, links, travelStyles, favourites, interestIds],
  );
  const save = useMutation({
    mutationFn: () => useCases.saveProfile(account, edit),
    onSuccess: (next) => accountChanged(next),
  });

  const nameOk = isDisplayNameValid(displayName);
  const handleOk = handleStatus === 'unchanged' || handleStatus === 'available' || handleStatus === 'checkFailed';
  // Changed interests must land in the API's 3–8; an untouched empty set is left alone.
  const interestsOk = edit.interestIds === undefined || interestsCountOk(interestIds.length);
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
    /** No city because location is off: `blocked` means only Settings can turn it on. */
    cityNeedsLocation: !city && !detected.isFetching && permission.data !== undefined && permission.data !== 'granted',
    cityBlocked: permission.data === 'blocked',
    openLocationSettings: openAppSettings,
    /** The gallery as saved (the screen's `account` follows the cache), plus how many picked photos are on their way. */
    photos: account.photos,
    photosFull: account.photos.length >= PHOTOS_MAX,
    uploadingPhotos,
    addPhotos: () => void addPhotos(),
    removePhoto: (photo: ProfilePhoto) => removePhoto.mutate(photo),
    removingPhotoId: removePhoto.isPending ? (removePhoto.variables?.id ?? null) : null,
    movePhoto,
    /** Held still while photos are on their way or one is coming off: the order must name every saved photo. */
    canReorder: uploadingPhotos === 0 && !removePhoto.isPending,
    galleryError: errorCodeOf(addPhoto.error ?? removePhoto.error ?? reorderPhotos.error),
    /** What may be picked (`GET /interests`), in the server's order. */
    allInterests: (interests.data ?? null) as Interest[] | null,
    interestsLoading: interests.isPending,
    interestsFailed: interests.isError,
    retryInterests: () => void interests.refetch(),
    interestIds,
    interestsFull: interestIds.length >= INTERESTS_MAX,
    interestsOk,
    toggleInterest: (id: string) => setInterestIds((list) => toggleIn(list, id, INTERESTS_MAX)),
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
    canSave: hasChanges(edit) && nameOk && handleOk && interestsOk && !save.isPending,
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
    // Favourite destinations: countries and regions too ("Qatar", "Bali"), not only cities.
    queryKey: settingsKeys.destinations(settled.toLowerCase()),
    queryFn: ({ signal }) => useCases.searchDestinations(settled, signal),
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
