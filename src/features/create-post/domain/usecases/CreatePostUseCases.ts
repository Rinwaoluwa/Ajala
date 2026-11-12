import { CreatePostError } from '../entities/CreatePostError';
import type {
  Coordinates,
  DraftPlace,
  Interest,
  PlaceOption,
  PlaceSearchKind,
  PostDraft,
} from '../entities/PostDraft';
import type { PlaceFinder, PlaceLocator, PostRepository } from '../repositories/PostRepository';
import { draftFromSaved, toSubmission } from '../rules/postDraftRules';

/**
 * The wizard's two ways out (API map §5):
 *
 *   - Publish: a first send is one `POST /posts` with `status=published`. A post
 *     already saved as a draft is brought up to date (`PATCH`, which carries
 *     a Plan's itinerary and an Event's schedule, then its photos) and then
 *     published.
 *   - Save draft: the same, with `status=draft` the first time and updates after.
 *
 * Photos are sent again only when they changed since the last save.
 */

export type SendInput = {
  draft: PostDraft;
  /** The id from an earlier Save draft, or null. */
  postId: string | null;
  /** Whether the photos changed since that save (always true without one). */
  photosChanged: boolean;
};

async function bringUpToDate(
  repo: PostRepository,
  postId: string,
  { draft, photosChanged }: SendInput,
  live = false,
) {
  const submission = toSubmission(draft);
  await repo.update(postId, submission, { live });
  // A draft may have no photos; the images call needs at least one.
  if (photosChanged && submission.photos.length > 0) await repo.replaceImages(postId, submission.photos);
}

export const makePublishPost =
  (repo: PostRepository) =>
  async (input: SendInput): Promise<string> => {
    if (!input.postId) return repo.create(toSubmission(input.draft), 'published');
    await bringUpToDate(repo, input.postId, input);
    await repo.publish(input.postId);
    return input.postId;
  };

export const makeSaveDraft =
  (repo: PostRepository) =>
  async (input: SendInput): Promise<string> => {
    if (!input.postId) return repo.create(toSubmission(input.draft), 'draft');
    await bringUpToDate(repo, input.postId, input);
    return input.postId;
  };

/**
 * Editing a post that is already live (Edit post from its page): the same
 * `PATCH`, and its photos when they changed, but no publish — it is published
 * already. Only an existing post can be edited.
 */
export const makeSaveChanges =
  (repo: PostRepository) =>
  async (input: SendInput): Promise<string> => {
    if (!input.postId) throw new CreatePostError('unknown');
    await bringUpToDate(repo, input.postId, input, true);
    return input.postId;
  };

/** The meeting point's pin. Throws `placeNotFound` when the geocoder has no match. */
export const makeLocatePlace =
  (locator: PlaceLocator) =>
  async (text: string): Promise<Coordinates> => {
    const coords = await locator.locate(text);
    if (!coords) throw new CreatePostError('placeNotFound');
    return coords;
  };

export const makeListInterests = (repo: PostRepository) => (): Promise<Interest[]> => repo.listInterests();

/** Fewer letters than this match too much to be worth a (billed) search. */
export const PLACE_QUERY_MIN = 2;

/**
 * The place pickers' search: cities for a destination, any place for a meeting
 * point. Nothing is searched under two letters.
 */
export const makeSearchPlaces =
  (finder: PlaceFinder) =>
  async (
    kind: PlaceSearchKind,
    query: string,
    near: Coordinates | null = null,
    signal?: AbortSignal,
    ownAreaOnly = false,
  ): Promise<PlaceOption[]> => {
    const q = query.trim();
    return q.length < PLACE_QUERY_MIN ? [] : finder.search(kind, q, near, signal, ownAreaOnly);
  };

/** A picked suggestion, with the address and coordinates the screen shows. */
export const makePlaceDetails =
  (finder: PlaceFinder) =>
  (placeId: string, signal?: AbortSignal): Promise<DraftPlace> =>
    finder.details(placeId, signal);

/** A saved draft, back in the wizard's terms (Settings / Drafts → Continue editing). */
export const makeLoadDraft =
  (repo: PostRepository) =>
  async (postId: string): Promise<PostDraft> =>
    draftFromSaved(await repo.getPost(postId));
