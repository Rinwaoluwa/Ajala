import type { Bbox, PostType } from '../entities/Explore';
import type { ExploreRepository } from '../repositories/ExploreRepository';
import { LIST_PAGE_SIZE, readSearch, toReportPayload, type ReportReasonKey } from '../rules/exploreRules';

export const makeLoadPins =
  (repo: ExploreRepository) =>
  (bbox: Bbox, type: PostType | null, titleFilter: string | null = null) =>
    repo.getPins(bbox, type, titleFilter?.trim().slice(0, 80) || null);

export const makeLoadPost = (repo: ExploreRepository) => (postId: string) => repo.getPost(postId);

export const makeJoin = (repo: ExploreRepository) => (postId: string) => repo.rsvp(postId);

/** Before a pay-or-book link opens: the host sees the click (spec §2.12). Best effort. */
export const makeRecordLinkClick = (repo: ExploreRepository) => async (postId: string) => {
  try {
    await repo.recordLinkClick(postId);
  } catch {
    // The link still opens; a missed count is not worth stopping someone booking.
  }
};

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

/** The map's city search, from two characters. */
export const makeSearchPlaces = (repo: ExploreRepository) => async (query: string) => {
  const q = query.trim();
  return q.length < 2 ? [] : repo.searchPlaces(q, 6);
};

export const makeRsvpNotice = (repo: ExploreRepository) => ({
  seen: () => repo.hasSeenRsvpNotice(),
  acknowledge: () => repo.markRsvpNoticeSeen(),
});
