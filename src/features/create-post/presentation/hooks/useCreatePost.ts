import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import { postMedia } from '../../createPostModule';
import { CreatePostError, isCreatePostError } from '../../domain/entities/CreatePostError';
import { emptyDraft, type PostDraft } from '../../domain/entities/PostDraft';
import type { PostKind } from '../../domain/postKinds';
import {
  NOTES_MAX,
  PHOTOS_MAX,
  STEPS,
  canLeaveStep,
  canSaveDraft,
  firstIncompleteStep,
  move,
  needsPin,
  stepIssues,
  toggleInterest,
  type DraftIssues,
} from '../../domain/rules/postDraftRules';
import { LISTS_A_NEW_POST_JOINS, createPostKeys } from '../state/createPostQueries';
import { useCreatePostUseCases } from '../state/useCreatePostUseCases';

/**
 * View model for the create wizard (API map §5): the draft every step edits,
 * which step is showing, and the two ways out — Publish and Save draft.
 *
 * Everything stays on the phone until one of those is tapped. Moving on from
 * "When and where?" finds the meeting point on the map first (a Meetup or Event
 * cannot publish without a pin); a place that cannot be found stops there with a
 * message under the field.
 *
 * After a Save draft the post has an id, and later saves and Publish update it
 * rather than create another. Photos are uploaded again only when they changed.
 *
 * Interests are required to publish but missing from the design (API map §12),
 * so the review step asks for them; the list is a query cached for an hour.
 */

export type PublishOutcome =
  { kind: 'idle' } | { kind: 'published'; postId: string } | { kind: 'failed'; error: CreatePostError };

let keySeed = 0;
const nextKey = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(keySeed += 1)}`;

export function useCreatePost(kind: PostKind, draftId: string | null = null) {
  const useCases = useCreatePostUseCases();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<PostDraft>(() => emptyDraft(kind));
  const [stepIndex, setStepIndex] = useState(0);
  /** +1 forward, −1 back: which way the step change slides. */
  const [direction, setDirection] = useState<1 | -1>(1);
  const [postId, setPostId] = useState<string | null>(null);
  const [placeError, setPlaceError] = useState<CreatePostError | null>(null);
  const [outcome, setOutcome] = useState<PublishOutcome>({ kind: 'idle' });
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  /**
   * The post as it was last saved (or as a resumed draft arrived), to tell
   * whether leaving would lose anything. Null until there is a saved copy.
   */
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  /** The photos as last uploaded, to skip re-sending an unchanged carousel. */
  const [uploadedPhotos, setUploadedPhotos] = useState<string | null>(null);

  // Carrying on with a saved draft (Settings / Drafts): load it once, then edit it
  // as if it had been saved from here — later saves update it, and its photos are
  // only sent again when they change.
  const saved = useQuery({
    queryKey: createPostKeys.draft(draftId ?? ''),
    queryFn: () => useCases.loadDraft(draftId as string),
    enabled: draftId !== null,
    staleTime: Infinity,
    gcTime: 0,
  });
  const [hydratedFrom, setHydratedFrom] = useState<string | null>(null);
  if (draftId && saved.data && hydratedFrom !== draftId) {
    setHydratedFrom(draftId);
    setDraft(saved.data);
    setPostId(draftId);
    setUploadedPhotos(saved.data.photos.map((p) => p.uri).join('|'));
    setSavedSnapshot(snapshotOf(saved.data));
  }

  const step = STEPS[stepIndex] ?? 'basics';
  const update = useCallback((patch: Partial<PostDraft>) => setDraft((d) => ({ ...d, ...patch })), []);

  // ---------- step-specific edits ----------

  const setPlace = useCallback((place: string) => {
    // A new place needs finding again.
    setDraft((d) => ({ ...d, place, placeCoords: null }));
    setPlaceError(null);
  }, []);

  const addPhotos = useCallback(async () => {
    const room = PHOTOS_MAX - draft.photos.length;
    const picked = await postMedia.pickImages({ limit: room });
    if (!picked.length) return;
    setDraft((d) => ({
      ...d,
      photos: [...d.photos, ...picked.map((p) => ({ ...p, key: nextKey('photo') }))].slice(0, PHOTOS_MAX),
    }));
  }, [draft.photos.length]);

  const removePhoto = useCallback(
    (key: string) => setDraft((d) => ({ ...d, photos: d.photos.filter((p) => p.key !== key) })),
    [],
  );
  const movePhoto = useCallback(
    (from: number, to: number) => setDraft((d) => ({ ...d, photos: move(d.photos, from, to) })),
    [],
  );

  const addNote = useCallback(
    () =>
      setDraft((d) =>
        d.notes.length >= NOTES_MAX ? d : { ...d, notes: [...d.notes, { key: nextKey('note'), text: '' }] },
      ),
    [],
  );
  const setNote = useCallback(
    (key: string, text: string) =>
      setDraft((d) => ({ ...d, notes: d.notes.map((n) => (n.key === key ? { ...n, text } : n)) })),
    [],
  );
  const removeNote = useCallback(
    (key: string) => setDraft((d) => ({ ...d, notes: d.notes.filter((n) => n.key !== key) })),
    [],
  );
  const moveNote = useCallback(
    (from: number, to: number) => setDraft((d) => ({ ...d, notes: move(d.notes, from, to) })),
    [],
  );

  const chooseInterest = useCallback(
    (id: string) => setDraft((d) => ({ ...d, interestIds: toggleInterest(d.interestIds, id) })),
    [],
  );

  // ---------- moving between steps ----------

  const locate = useMutation({
    mutationFn: (text: string) => useCases.locatePlace(text),
  });

  const goTo = useCallback(
    (index: number) => {
      setDirection(index >= stepIndex ? 1 : -1);
      setStepIndex(Math.max(0, Math.min(STEPS.length - 1, index)));
    },
    [stepIndex],
  );

  const next = useCallback(async () => {
    if (!canLeaveStep(draft, step)) return;
    // The pin comes from the meeting point. Meetups and Events need it; Plans and
    // Groups use it when it can be found, and their city when not.
    if (step === 'schedule' && draft.place.trim() && !draft.placeCoords) {
      try {
        const coords = await locate.mutateAsync(draft.place);
        update({ placeCoords: coords });
      } catch (e) {
        if (needsPin(draft.kind)) {
          setPlaceError(isCreatePostError(e) ? e : null);
          return;
        }
      }
    }
    goTo(stepIndex + 1);
  }, [draft, step, stepIndex, locate, update, goTo]);

  const back = useCallback(() => goTo(stepIndex - 1), [goTo, stepIndex]);

  // ---------- sending ----------

  const photosSignature = draft.photos.map((p) => p.uri).join('|');
  const sendInput = () => ({
    draft,
    postId,
    photosChanged: uploadedPhotos !== photosSignature,
  });

  const saveDraft = useMutation({
    mutationFn: (input: ReturnType<typeof sendInput>) => useCases.saveDraft(input),
    onSuccess: (id, input) => {
      setPostId(id);
      setUploadedPhotos(input.draft.photos.map((p) => p.uri).join('|'));
      setDraftSavedAt(Date.now());
      // What was sent, not what is on screen now: an edit made while saving is still unsaved.
      setSavedSnapshot(snapshotOf(input.draft));
    },
  });

  const publish = useMutation({
    mutationFn: () => useCases.publish(sendInput()),
    onSuccess: (id) => {
      setPostId(id);
      setUploadedPhotos(photosSignature);
      setOutcome({ kind: 'published', postId: id });
      LISTS_A_NEW_POST_JOINS.forEach((queryKey) => void queryClient.invalidateQueries({ queryKey }));
    },
    onError: (e) => {
      if (isCreatePostError(e)) setOutcome({ kind: 'failed', error: e });
    },
  });

  const interests = useQuery({
    queryKey: createPostKeys.interests,
    queryFn: () => useCases.listInterests(),
    staleTime: 60 * 60_000,
    // Only the review step shows them; fetching early means they are there when it does.
    enabled: stepIndex >= STEPS.indexOf('cost'),
  });

  const issues: DraftIssues = useMemo(() => stepIssues(draft, step), [draft, step]);
  const incomplete = useMemo(() => firstIncompleteStep(draft), [draft]);
  const hasContent = draft.photos.length > 0 || draft.title.trim() !== '' || draft.description.trim() !== '';
  const currentSnapshot = useMemo(() => snapshotOf(draft), [draft]);
  const unsavedChanges = savedSnapshot === null ? hasContent : currentSnapshot !== savedSnapshot;

  return {
    kind,
    /** A saved draft is being fetched (Continue editing); the steps wait for it. */
    loadingDraft: draftId !== null && hydratedFrom !== draftId && !saved.isError,
    draftFailed: saved.isError,
    retryDraft: () => void saved.refetch(),
    draft,
    update,
    step,
    stepIndex,
    direction,
    issues,
    canContinue: Object.keys(issues).length === 0 && !locate.isPending,
    locating: locate.isPending,
    placeError,
    next,
    back,
    goTo,
    goToStep: (s: (typeof STEPS)[number]) => goTo(STEPS.indexOf(s)),
    /** The first step still missing something, for the review step's list. */
    incomplete,
    allIssues: useMemo(
      () => Object.assign({}, ...STEPS.map((s) => stepIssues(draft, s))) as DraftIssues,
      [draft],
    ),

    setPlace,
    addPhotos,
    removePhoto,
    movePhoto,
    addNote,
    setNote,
    removeNote,
    moveNote,
    chooseInterest,

    interests: interests.data ?? null,
    interestsLoading: interests.isPending && interests.fetchStatus !== 'idle',
    interestsFailed: interests.isError,
    retryInterests: () => void interests.refetch(),

    hasContent,
    /** Whether leaving now would lose something: edits since the last save, or content never saved. */
    unsavedChanges,
    canSaveDraft: canSaveDraft(draft) && !saveDraft.isPending && !publish.isPending,
    savingDraft: saveDraft.isPending,
    draftSavedAt,
    /** Resolves with the reason it failed, or null once saved. */
    saveDraft: (): Promise<CreatePostError | null> =>
      saveDraft.mutateAsync(sendInput()).then(
        () => null,
        (e: unknown) => (isCreatePostError(e) ? e : new CreatePostError('unknown')),
      ),

    canPublish: incomplete === null && !publish.isPending,
    publishing: publish.isPending,
    publish: () => {
      setOutcome({ kind: 'idle' });
      publish.mutate();
    },
    outcome,
    clearOutcome: () => setOutcome({ kind: 'idle' }),
  };
}

/** A comparable copy of the post, to tell an edit from what was saved. */
const snapshotOf = (draft: PostDraft) => JSON.stringify(draft);

export type CreatePostViewModel = ReturnType<typeof useCreatePost>;
