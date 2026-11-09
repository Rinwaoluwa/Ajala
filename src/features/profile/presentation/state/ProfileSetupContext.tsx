import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { sharedQueryKeys } from '@core/api/queryClient/queryClient';
import { useAuthorizedRequest } from '@features/auth';

import type {
  CityDetection,
  Gender,
  ImageFile,
  MyProfile,
  PlaceRef,
  TravelStyle,
} from '../../domain/entities/Profile';
import { isProfileError, type ProfileErrorCode } from '../../domain/entities/ProfileError';
import { missingBasics, type MissingBasics } from '../../domain/rules/profileSetupRules';
import { createProfileUseCases, type ProfileUseCases } from '../../profileModule';
import { profileKeys } from './profileQueries';

/**
 * Everything profile setup collects, held across its screens until the last
 * one sends it (`saveSetup`), over the profile as `GET /me` describes it.
 *
 * Mounted by the setup route group's layout, so leaving setup drops the draft.
 *
 * The profile is a TanStack Query (`sharedQueryKeys.me`): it prefills whatever an
 * earlier, unfinished run already saved, and says which of name and date of
 * birth are missing. The draft holds only what the person changed here; every
 * other field reads through to the cached profile. The city lookup from the
 * phone's location (`detectCity`, Google places' `cityAt`) is a query too,
 * asked once "Set up your profile" is on screen (it shows the location prompt
 * if it has not been answered). The city cannot be picked by hand: it is
 * always where the phone is.
 *
 * The avatar is the exception to "send at the end": a photo uploads as soon as
 * it is picked (`POST /me/avatar`), shown from the phone while it goes, and the
 * cached profile takes the new URL when it lands.
 *
 * Travel styles and favourite destinations prefill from the profile too, so a
 * second run through setup starts from what was saved.
 */

export type SetupDraft = {
  /**
   * Home city, a Google place (sent as `homePlaceId`). Where the phone is, never
   * picked by hand; the saved one only while that cannot be found.
   */
  homeCity: PlaceRef | null;
  /** The city came from the phone's location ("Auto-detected"). */
  cityDetected: boolean;
  languages: string[];
  gender: Gender | null;
  fullName: string;
  dateOfBirth: string | null;
  travelStyles: TravelStyle[];
  /** Favourite destinations, as cities (sent as `extras.favouriteDestinationIds`). */
  destinations: PlaceRef[];
  interestIds: string[];
  /** "Skip" on "What are you into?". */
  skippedInterests: boolean;
};

export type AvatarState = {
  /** What to show: the uploaded URL, or the local file while it uploads. */
  uri: string | null;
  uploading: boolean;
  error: ProfileErrorCode | null;
};

type ProfileSetupValue = {
  useCases: ProfileUseCases;
  profile: MyProfile | null;
  /** `GET /me` failed: setup cannot start until it answers. */
  loadError: ProfileErrorCode | null;
  reload: () => void;
  missing: MissingBasics;
  draft: SetupDraft;
  update: (patch: Partial<SetupDraft>) => void;
  detectingCity: boolean;
  /** The last lookup's answer; null before the first one lands. */
  cityDetection: CityDetection | null;
  /** Looks the city up from the phone's location; again when it already has. */
  detectCity: () => void;
  avatar: AvatarState;
  uploadAvatar: (file: ImageFile) => void;
  removeAvatar: () => void;
  /** The profile after a PATCH, for the steps that follow it. */
  setProfile: (profile: MyProfile) => void;
};

type AvatarChange = { action: 'upload'; file: ImageFile } | { action: 'remove' };

const ProfileSetupContext = createContext<ProfileSetupValue | null>(null);

const errorCode = (e: unknown): ProfileErrorCode => (isProfileError(e) ? e.code : 'unknown');

export function ProfileSetupProvider({ children }: { children: ReactNode }) {
  const request = useAuthorizedRequest();
  const useCases = useMemo(() => createProfileUseCases(request), [request]);
  const queryClient = useQueryClient();

  const me = useQuery({ queryKey: sharedQueryKeys.me, queryFn: () => useCases.getMyProfile() });
  const profile = me.data ?? null;

  // Only what the person changed in this run; the rest reads through to the profile.
  const [edits, setEdits] = useState<Partial<SetupDraft>>({});
  const update = useCallback((patch: Partial<SetupDraft>) => setEdits((e) => ({ ...e, ...patch })), []);

  const [detectAsked, setDetectAsked] = useState(false);
  const detected = useQuery({
    queryKey: profileKeys.detectedCity,
    queryFn: () => useCases.detectHomeCity(),
    enabled: detectAsked && profile !== null,
    // Where the phone is does not change during setup; ask once, and again on "Try again".
    staleTime: Infinity,
  });
  const detectedCity = detected.data?.kind === 'found' ? detected.data.city : null;
  const detectCity = useCallback(() => {
    if (detectAsked) void detected.refetch();
    else setDetectAsked(true);
  }, [detectAsked, detected]);

  const setProfile = useCallback(
    (next: MyProfile) => queryClient.setQueryData(sharedQueryKeys.me, next),
    [queryClient],
  );

  const avatarChange = useMutation({
    mutationFn: async (change: AvatarChange) =>
      change.action === 'upload' ? useCases.uploadAvatar(change.file) : (await useCases.removeAvatar(), null),
    onSuccess: (avatarUrl, change) =>
      queryClient.setQueryData<MyProfile>(sharedQueryKeys.me, (current) =>
        current
          ? { ...current, avatarUrl: change.action === 'upload' ? (avatarUrl ?? change.file.uri) : null }
          : current,
      ),
  });

  const pending = avatarChange.isPending ? avatarChange.variables : undefined;
  const avatar: AvatarState = {
    uri: pending ? (pending.action === 'upload' ? pending.file.uri : null) : (profile?.avatarUrl ?? null),
    uploading: avatarChange.isPending,
    error: avatarChange.error ? errorCode(avatarChange.error) : null,
  };

  const draft: SetupDraft = {
    homeCity: detectedCity ?? profile?.homePlace ?? null,
    cityDetected: detectedCity !== null,
    languages: edits.languages ?? profile?.languages ?? [],
    gender: edits.gender !== undefined ? edits.gender : (profile?.gender ?? null),
    fullName: edits.fullName ?? '',
    dateOfBirth: edits.dateOfBirth ?? null,
    travelStyles: edits.travelStyles ?? profile?.travelStyles ?? [],
    destinations: edits.destinations ?? profile?.favouriteDestinations ?? [],
    interestIds: edits.interestIds ?? profile?.interests.map((i) => i.id) ?? [],
    skippedInterests: edits.skippedInterests ?? false,
  };

  const value: ProfileSetupValue = {
    useCases,
    profile,
    loadError: me.error ? errorCode(me.error) : null,
    reload: () => void me.refetch(),
    missing: profile ? missingBasics(profile) : { name: false, dateOfBirth: false },
    draft,
    update,
    detectingCity: detected.isFetching,
    cityDetection: detected.data ?? null,
    detectCity,
    avatar,
    uploadAvatar: (file) => avatarChange.mutate({ action: 'upload', file }),
    removeAvatar: () => avatarChange.mutate({ action: 'remove' }),
    setProfile,
  };

  return <ProfileSetupContext.Provider value={value}>{children}</ProfileSetupContext.Provider>;
}

export function useProfileSetup(): ProfileSetupValue {
  const value = useContext(ProfileSetupContext);
  if (!value) throw new Error('useProfileSetup must be used inside ProfileSetupProvider (the setup layout).');
  return value;
}
