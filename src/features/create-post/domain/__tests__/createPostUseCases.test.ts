import { describe, expect, it } from '@jest/globals';

import { CreatePostError } from '../entities/CreatePostError';
import { emptyDraft } from '../entities/PostDraft';
import type { PlaceFinder, PostRepository } from '../repositories/PostRepository';
import {
  makeLocatePlace,
  makePlaceDetails,
  makePublishPost,
  makeSaveDraft,
  makeSearchPlaces,
} from '../usecases/CreatePostUseCases';

function fakeRepo() {
  const calls: string[] = [];
  const repo: PostRepository = {
    getPost: async () => {
      throw new Error('not used');
    },
    create: async (_s, status) => {
      calls.push(`create:${status}`);
      return 'post-1';
    },
    update: async (id) => void calls.push(`update:${id}`),
    replaceImages: async (id, photos) => void calls.push(`images:${id}:${photos.length}`),
    publish: async (id) => void calls.push(`publish:${id}`),
    listInterests: async () => [],
  };
  return { repo, calls };
}

const draft = {
  ...emptyDraft('plan'),
  title: 'Amsterdam After Dark',
  photos: [{ key: 'a', uri: 'file:///a.jpg', name: 'a.jpg', type: 'image/jpeg' as const }],
  notes: [{ key: 'n', text: 'Day 1' }],
};

describe('publish', () => {
  it('sends a new post in one request', async () => {
    const { repo, calls } = fakeRepo();
    expect(await makePublishPost(repo)({ draft, postId: null, photosChanged: true })).toBe('post-1');
    expect(calls).toEqual(['create:published']);
  });

  it('brings a saved draft up to date, then publishes it', async () => {
    const { repo, calls } = fakeRepo();
    await makePublishPost(repo)({ draft, postId: 'd1', photosChanged: true });
    // A Plan's itinerary goes in the PATCH; there is no checklist call any more.
    expect(calls).toEqual(['update:d1', 'images:d1:1', 'publish:d1']);
  });

  it('skips the photos when they have not changed', async () => {
    const { repo, calls } = fakeRepo();
    await makePublishPost(repo)({ draft: { ...draft, kind: 'meetup' }, postId: 'd1', photosChanged: false });
    expect(calls).toEqual(['update:d1', 'publish:d1']);
  });
});

describe('save draft', () => {
  it('creates a draft the first time and updates it after', async () => {
    const { repo, calls } = fakeRepo();
    const save = makeSaveDraft(repo);
    await save({ draft, postId: null, photosChanged: true });
    await save({ draft: { ...draft, photos: [] }, postId: 'post-1', photosChanged: true });
    // A draft with no photos does not call the images endpoint, which needs one.
    expect(calls).toEqual(['create:draft', 'update:post-1']);
  });
});

describe('finding the meeting point', () => {
  it('says so when the place cannot be found', async () => {
    const locate = makeLocatePlace({ locate: async () => null });
    await expect(locate('Nowhere')).rejects.toBeInstanceOf(CreatePostError);
    const found = makeLocatePlace({ locate: async () => ({ lat: 1, lng: 2 }) });
    expect(await found('Lekki')).toEqual({ lat: 1, lng: 2 });
  });
});

describe('place search', () => {
  function fakeFinder() {
    const calls: string[] = [];
    const finder: PlaceFinder = {
      search: async (kind, text, near, signal) => {
        calls.push(`${kind}:${text}:${near ? `${near.lat},${near.lng}` : '-'}:${signal ? 'signal' : '-'}`);
        return [{ placeId: 'g-ams', name: 'Amsterdam', detail: 'Netherlands' }];
      },
      details: async (placeId) => ({ placeId, name: 'Amsterdam', address: 'Amsterdam, Netherlands', coords: null }),
      endSession: () => void calls.push('end'),
    };
    return { finder, calls };
  }

  it('waits for two letters, and passes the area and the abort signal on', async () => {
    const { finder, calls } = fakeFinder();
    const search = makeSearchPlaces(finder);
    expect(await search('cities', ' a ')).toEqual([]);
    const signal = new AbortController().signal;
    await search('places', ' Terra ', { lat: 6.4, lng: 3.4 }, signal);
    expect(calls).toEqual(['places:Terra:6.4,3.4:signal']);
  });

  it('looks up a picked place', async () => {
    const { finder } = fakeFinder();
    expect(await makePlaceDetails(finder)('g-ams')).toMatchObject({ placeId: 'g-ams', name: 'Amsterdam' });
  });
});
