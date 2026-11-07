import type { RsvpListState, TripsPage } from '../entities/Trip';

/**
 * What the Trips tab needs from the API (spec §2.16, API map §8). Each list
 * comes back as trip cards already tagged with how I relate to the post.
 * Every method throws `TripsError`.
 */
export interface TripsRepository {
  /** `GET /me/posts?status=published`: posts I host, newest first, past ones included. */
  listHosted(cursor: string | null, limit: number): Promise<TripsPage>;
  /**
   * `GET /me/rsvps?state=`: live posts I'm going to that haven't ended, or
   * private ones I asked to join that the host hasn't answered; soonest first.
   */
  listRsvps(state: RsvpListState, cursor: string | null, limit: number): Promise<TripsPage>;
  /** `GET /me/attended`: past posts I went to, latest first. */
  listAttended(cursor: string | null, limit: number): Promise<TripsPage>;
}
