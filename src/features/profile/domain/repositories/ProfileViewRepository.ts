import type { ActivityPage, PersonReportReason, PublicProfile } from '../entities/PublicProfile';

/**
 * What the profile pages need beyond setup (spec §2.14, §3.6, §3.9). Calls
 * reject with `ProfileError`.
 */
export interface ProfileViewRepository {
  /** Past posts the signed-in person went to (`GET /me/attended`). */
  getMyAttended(cursor: string | null, limit: number): Promise<ActivityPage>;
  /** `GET /users/:id` — 404 (`notFound`) when they are suspended, deleted, or blocked the viewer. */
  getPerson(userId: string): Promise<PublicProfile>;
  getPersonPosts(userId: string, cursor: string | null, limit: number): Promise<ActivityPage>;
  getPersonAttended(userId: string, cursor: string | null, limit: number): Promise<ActivityPage>;
  block(userId: string): Promise<void>;
  unblock(userId: string): Promise<void>;
  report(userId: string, reason: PersonReportReason, details: string | null): Promise<void>;
}
