import { CreatePostError } from '../entities/CreatePostError';
import type { Coordinates, DraftCity, Interest, PostDraft } from '../entities/PostDraft';
import type { PlaceLocator, PostRepository } from '../repositories/PostRepository';
import { draftFromSaved, toSubmission } from '../rules/postDraftRules';

/**
 * The wizard's two ways out (API map §5):
 *
 *   - Publish: a first send is one `POST /posts` with `status=published`. A post
 *     already saved as a draft is brought up to date (`PATCH`, its photos and a
 *     Plan's checklist) and then published.
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

async function bringUpToDate(repo: PostRepository, postId: string, { draft, photosChanged }: SendInput) {
  const submission = toSubmission(draft);
  await repo.update(postId, submission);
  // A draft may have no photos; the images call needs at least one.
  if (photosChanged && submission.photos.length > 0) await repo.replaceImages(postId, submission.photos);
  if (draft.kind === 'plan') await repo.replaceChecklist(postId, submission.checklist ?? []);
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

/** The meeting point's pin. Throws `placeNotFound` when the geocoder has no match. */
export const makeLocatePlace =
  (locator: PlaceLocator) =>
  async (text: string): Promise<Coordinates> => {
    const coords = await locator.locate(text);
    if (!coords) throw new CreatePostError('placeNotFound');
    return coords;
  };

export const makeListInterests = (repo: PostRepository) => (): Promise<Interest[]> => repo.listInterests();

/** The destination search, from two characters. */
export const makeSearchCities =
  (repo: PostRepository) =>
  async (query: string): Promise<DraftCity[]> => {
    const q = query.trim();
    return q.length < 2 ? [] : repo.searchCities(q, 10);
  };

/** A saved draft, back in the wizard's terms (Settings / Drafts → Continue editing). */
export const makeLoadDraft =
  (repo: PostRepository) =>
  async (postId: string): Promise<PostDraft> =>
    draftFromSaved(await repo.getPost(postId));
