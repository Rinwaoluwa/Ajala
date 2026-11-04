import type { TripsPage } from '../entities/Trip';

/**
 * What the Trips tab needs from the API (API map §8). There is no list of the
 * posts a person joined or requested (`GET /me/rsvps`, API map §12), so only
 * hosted and attended posts can be read. Every method throws `TripsError`.
 */
export interface TripsRepository {
  /** `GET /me/posts?status=published`: posts I host, newest first. */
  listHosted(cursor: string | null, limit: number): Promise<TripsPage>;
  /** `GET /me/attended`: past posts I went to, latest first. */
  listAttended(cursor: string | null, limit: number): Promise<TripsPage>;
}
