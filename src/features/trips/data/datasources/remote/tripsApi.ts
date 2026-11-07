import type { RsvpListState } from '../../../domain/entities/Trip';
import type { MyPostDto, PageDto, PostCardDto } from '../../dto/tripsDtos';

/** The API's version prefix, as every other client in the app writes it. */
const V1 = '/api/v1';

/** The Trips endpoints as the signed-in person (spec §2.16, API map §8). `request` is auth's `AuthorizedRequest`. */
export type TripsRequest = <T>(request: { method: 'GET'; path: string }) => Promise<T>;

const query = (params: Record<string, string | number | null>) =>
  Object.entries(params)
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');

export function createTripsApi(request: TripsRequest) {
  return {
    listMyPosts: (status: 'published' | 'draft', cursor: string | null, limit: number) =>
      request<PageDto<MyPostDto>>({
        method: 'GET',
        path: `${V1}/me/posts?${query({ status, cursor, limit })}`,
      }),

    listRsvps: (state: RsvpListState, cursor: string | null, limit: number) =>
      request<PageDto<PostCardDto>>({
        method: 'GET',
        path: `${V1}/me/rsvps?${query({ state, cursor, limit })}`,
      }),

    listAttended: (cursor: string | null, limit: number) =>
      request<PageDto<PostCardDto>>({
        method: 'GET',
        path: `${V1}/me/attended?${query({ cursor, limit })}`,
      }),
  };
}
