import type { FeedPageDto, MeTravelDto, PostTypeDto, TeleportDto } from '../../dto/feedDtos';

/** The API's version prefix, as every other client in the app writes it. */
const V1 = '/api/v1';

/**
 * The feed's and Travel's endpoints as the signed-in person (spec §2.11, §2.19;
 * API map §4). `request` is auth's `AuthorizedRequest`.
 *
 * City search is not here: the API has none (`GET /cities` is gone), so Travel
 * searches with `@core/places` on the phone.
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
    /**
     * The location header is where the feed looks unless a teleport is set, and
     * fills `distanceKm`. Without either the server answers 404 NO_LOCATION.
     */
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

    /** 204; 400 unknown place or not a city, 402 PAYMENT_REQUIRED without Travel, 503 map vendor down. */
    teleport: (body: TeleportDto) => request<void>({ method: 'POST', path: `${V1}/me/teleport`, body }),

    /** 204, always: back to where the phone is. */
    returnHome: () => request<void>({ method: 'DELETE', path: `${V1}/me/teleport` }),

    /** `GET /me`, read only for its teleport and home place (`MeTravelDto`). */
    getTravelState: () => request<MeTravelDto>({ method: 'GET', path: `${V1}/me` }),
  };
}
