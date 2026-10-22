import type { CityDto, FeedPageDto, PostTypeDto } from '../../dto/feedDtos';

/** The API's version prefix, as every other client in the app writes it. */
const V1 = '/api/v1';

/**
 * The feed's endpoints as the signed-in person (spec §2.11, API map §4).
 * `request` is auth's `AuthorizedRequest`.
 */
export type FeedRequest = <T>(request: {
  method: 'GET';
  path: string;
  headers?: Record<string, string>;
}) => Promise<T>;

const query = (params: Record<string, string | number | null>) =>
  Object.entries(params)
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');

export function createFeedApi(request: FeedRequest) {
  return {
    /** The location header picks the city and fills `distanceKm`; without it the server falls back. */
    getFeed: (
      type: 'all' | PostTypeDto,
      cursor: string | null,
      limit: number,
      headers: Record<string, string> | null,
    ) =>
      request<FeedPageDto>({
        method: 'GET',
        path: `${V1}/feed?${query({ type, cursor, limit })}`,
        headers: headers ?? undefined,
      }),

    searchCities: (q: string, limit: number) =>
      request<CityDto[]>({ method: 'GET', path: `${V1}/cities?${query({ q, limit })}` }),
  };
}
