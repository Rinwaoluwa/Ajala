import type { TripsRepository } from '../../domain/repositories/TripsRepository';
import { createTripsApi, type TripsRequest } from '../datasources/remote/tripsApi';
import { toTripsError, toTripsPage } from '../mappers/tripsMappers';

/** `TripsRepository` over the API. Nothing is cached here; the screen's queries cache. */
export function createTripsRepository(request: TripsRequest): TripsRepository {
  const api = createTripsApi(request);
  return {
    async listHosted(cursor, limit) {
      try {
        return toTripsPage(await api.listMyPosts('published', cursor, limit));
      } catch (e) {
        throw toTripsError(e);
      }
    },
    async listAttended(cursor, limit) {
      try {
        return toTripsPage(await api.listAttended(cursor, limit));
      } catch (e) {
        throw toTripsError(e);
      }
    },
  };
}
