import type { ActivityPage, PersonReportReason, ProfileActivity } from '../entities/PublicProfile';
import type { ProfileViewRepository } from '../repositories/ProfileViewRepository';

/** A page of a profile's activity list. */
export const PROFILE_PAGE_SIZE = 20;
/** Achievements read the whole attended history, a page of this many at a time … */
const HISTORY_PAGE = 50;
/** … up to this many pages: a lifetime of activity, without paging forever. */
const HISTORY_PAGES = 6;

/** Every page of an attended list, for achievements and the counters. */
async function wholeHistory(
  load: (cursor: string | null) => Promise<ActivityPage>,
): Promise<ProfileActivity[]> {
  const all: ProfileActivity[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < HISTORY_PAGES; i += 1) {
    const page = await load(cursor);
    all.push(...page.items);
    if (!page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return all;
}

export const makeLoadMyHistory = (repo: ProfileViewRepository) => () =>
  wholeHistory((cursor) => repo.getMyAttended(cursor, HISTORY_PAGE));

export const makeLoadPersonHistory = (repo: ProfileViewRepository) => (userId: string) =>
  wholeHistory((cursor) => repo.getPersonAttended(userId, cursor, HISTORY_PAGE));

export const makeGetPerson = (repo: ProfileViewRepository) => (userId: string) => repo.getPerson(userId);

export const makeLoadPersonActivity =
  (repo: ProfileViewRepository) => (userId: string, tab: 'hosting' | 'attending', cursor: string | null) =>
    tab === 'hosting'
      ? repo.getPersonPosts(userId, cursor, PROFILE_PAGE_SIZE)
      : repo.getPersonAttended(userId, cursor, PROFILE_PAGE_SIZE);

export const makeBlockPerson = (repo: ProfileViewRepository) => (userId: string) => repo.block(userId);
export const makeUnblockPerson = (repo: ProfileViewRepository) => (userId: string) => repo.unblock(userId);

/** `details` is required by the API for "other" (spec §2.14); trimmed to its 500 characters. */
export const REPORT_DETAILS_MAX = 500;
export const makeReportPerson =
  (repo: ProfileViewRepository) => (userId: string, reason: PersonReportReason, details: string) => {
    const text = details.trim().slice(0, REPORT_DETAILS_MAX);
    return repo.report(userId, reason, text || null);
  };

export const canSubmitPersonReport = (reason: PersonReportReason | null, details: string) =>
  reason !== null && (reason !== 'other' || details.trim().length > 0);
