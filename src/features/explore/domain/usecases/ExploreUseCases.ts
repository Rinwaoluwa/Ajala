import type { Bbox, PostType } from '../entities/Explore';
import type { ExploreRepository } from '../repositories/ExploreRepository';
import { LIST_PAGE_SIZE, readSearch, toReportPayload, type ReportReasonKey } from '../rules/exploreRules';

export const makeLoadPins =
  (repo: ExploreRepository) =>
  (bbox: Bbox, type: PostType | null, titleFilter: string | null = null) =>
    repo.getPins(bbox, type, titleFilter?.trim().slice(0, 80) || null);

/** Pins by interest come from the post search; the map's box does not apply (search looks 30 km round the origin). */
export const makeLoadPinsByInterest =
  (repo: ExploreRepository) => (interestId: string, type: PostType | null) =>
    repo.getPinsByInterest(interestId, type);

export const makeLoadPost = (repo: ExploreRepository) => (postId: string) => repo.getPost(postId);

export const makeJoin = (repo: ExploreRepository) => (postId: string) => repo.rsvp(postId);

/** When a post's link opens on joining: the host sees the click (spec §2.12). Best effort. */
export const makeRecordLinkClick = (repo: ExploreRepository) => async (postId: string) => {
  try {
    await repo.recordLinkClick(postId);
  } catch {
    // The link still opens and the RSVP still goes; a missed count is not worth stopping either.
  }
};

export const makeGetMe = (repo: ExploreRepository) => () => repo.getMe();

export const makeReportPost =
  (repo: ExploreRepository) => (postId: string, keys: readonly ReportReasonKey[], details: string) => {
    const payload = toReportPayload(keys, details);
    return repo.report(postId, payload.reason, payload.details);
  };

export const makeListInterests = (repo: ExploreRepository) => () => repo.listInterests();

/**
 * "Meetups Near You". `GET /explore/meetups` is gone (spec §2.11): with an
 * interest chosen it is a post search by that interest, meetups only; with none
 * it is the feed's meetups — search refuses a call with neither words nor
 * interests.
 */
export const makeLoadMeetups =
  (repo: ExploreRepository) =>
  (interestId: string | null, cursor: string | null = null) =>
    interestId
      ? repo.searchPosts({ words: null, interestIds: [interestId], type: 'meetup' }, cursor, LIST_PAGE_SIZE)
      : repo.getFeed('meetup', cursor, LIST_PAGE_SIZE);

/** The Explore list's search box (`GET /search/posts?q=`), every type, best match first. */
export const makeSearchPosts =
  (repo: ExploreRepository) =>
  async (text: string, cursor: string | null = null) => {
    const input = readSearch(text);
    if (input.kind !== 'ready') return { items: [], nextCursor: null };
    return repo.searchPosts({ words: input.words, interestIds: [], type: null }, cursor, LIST_PAGE_SIZE);
  };

/** Prices for the map's price filter (pins carry none): see `ExploreRepository.getPrices`. */
export const makeLoadPrices = (repo: ExploreRepository) => (type: PostType | null) => repo.getPrices(type);

/** The list's people search (`GET /search/people?q=`), on the same submitted words as the post search. */
export const makeSearchPeople =
  (repo: ExploreRepository) =>
  async (text: string, cursor: string | null = null) => {
    const input = readSearch(text);
    if (input.kind !== 'ready') return { items: [], nextCursor: null };
    return repo.searchPeople(input.words, cursor, LIST_PAGE_SIZE);
  };

/** The map's city search, from two characters. */
export const makeSearchPlaces = (repo: ExploreRepository) => async (query: string, signal?: AbortSignal) => {
  const q = query.trim();
  return q.length < 2 ? [] : repo.searchPlaces(q, signal);
};

/** Where a chosen city is, to move the camera there. */
export const makePlaceLocation = (repo: ExploreRepository) => (placeId: string) => repo.placeLocation(placeId);

/** The search was cleared without a choice: the next one is a new billing session. */
export const makeEndPlaceSearch = (repo: ExploreRepository) => () => repo.endPlaceSearch();

export const makeRsvpNotice = (repo: ExploreRepository) => ({
  seen: () => repo.hasSeenRsvpNotice(),
  acknowledge: () => repo.markRsvpNoticeSeen(),
});
