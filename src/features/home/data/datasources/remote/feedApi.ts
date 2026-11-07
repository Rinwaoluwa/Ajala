import type { CityDto, FeedPageDto, PostTypeDto, TeleportDto } from '../../dto/feedDtos';

/** The API's version prefix, as every other client in the app writes it. */
const V1 = '/api/v1';

/**
 * The feed's and Travel's endpoints as the signed-in person (spec §2.11, §2.19;
 * API map §4). `request` is auth's `AuthorizedRequest`.
 */
export type FeedRequest = <T>(request: {
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  body?: unknown;
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

    popularCities: () => request<CityDto[]>({ method: 'GET', path: `${V1}/cities/popular` }),

    /** 204; 402 PAYMENT_REQUIRED without Travel, 404 for a city that does not exist. */
    teleport: (body: TeleportDto) => request<void>({ method: 'POST', path: `${V1}/me/teleport`, body }),

    /** 204, always. */
    returnHome: () => request<void>({ method: 'DELETE', path: `${V1}/me/teleport` }),
  };
}
