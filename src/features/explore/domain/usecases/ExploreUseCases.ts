import type { Bbox, PostType } from '../entities/Explore';
import type { ExploreRepository } from '../repositories/ExploreRepository';
import { MEETUPS_PAGE_SIZE, toReportPayload, type ReportReasonKey } from '../rules/exploreRules';

export const makeLoadPins = (repo: ExploreRepository) => (bbox: Bbox, type: PostType | null) =>
  repo.getPins(bbox, type);

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

export const makeLoadMeetups =
  (repo: ExploreRepository) =>
  (interestId: string | null, cursor: string | null = null) =>
    repo.getMeetups(interestId, cursor, MEETUPS_PAGE_SIZE);

/** The map's city search, from two characters. */
export const makeSearchPlaces = (repo: ExploreRepository) => async (query: string) => {
  const q = query.trim();
  return q.length < 2 ? [] : repo.searchPlaces(q, 6);
};

export const makeRsvpNotice = (repo: ExploreRepository) => ({
  seen: () => repo.hasSeenRsvpNotice(),
  acknowledge: () => repo.markRsvpNoticeSeen(),
});
