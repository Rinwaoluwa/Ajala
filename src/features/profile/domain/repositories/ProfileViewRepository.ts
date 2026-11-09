import type {
  ActivityPage,
  PersonReportReason,
  PublicProfile,
  RsvpListState,
  SavedFilter,
} from '../entities/PublicProfile';

/**
 * What the profile pages need beyond setup (spec §2.14, §2.16, §3.12). Calls
 * reject with `ProfileError`.
 */
export interface ProfileViewRepository {
  /** Past posts the signed-in person went to (`GET /me/attended`). */
  getMyAttended(cursor: string | null, limit: number): Promise<ActivityPage>;
  /** What they saved, newest save first (`GET /me/saved?type=`). */
  getMySaved(filter: SavedFilter, cursor: string | null, limit: number): Promise<ActivityPage>;
  /** Going (upcoming), requested or waitlisted, soonest first (`GET /me/rsvps?state=`). */
  getMyRsvps(state: RsvpListState, cursor: string | null, limit: number): Promise<ActivityPage>;
  /** `GET /users/:id` — 404 (`notFound`) when they are suspended, deleted, or blocked the viewer. */
  getPerson(userId: string): Promise<PublicProfile>;
  getPersonPosts(userId: string, cursor: string | null, limit: number): Promise<ActivityPage>;
  getPersonAttended(userId: string, cursor: string | null, limit: number): Promise<ActivityPage>;
  /** Upcoming open posts they are going to; empty unless they share plans (`GET /users/:id/plans`). */
  getPersonPlans(userId: string, cursor: string | null, limit: number): Promise<ActivityPage>;
  block(userId: string): Promise<void>;
  unblock(userId: string): Promise<void>;
  report(userId: string, reason: PersonReportReason, details: string | null): Promise<void>;
}
