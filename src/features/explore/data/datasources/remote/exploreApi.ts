import type {
  CityDto,
  FeedPageDto,
  InterestDto,
  MapPinsDto,
  PostDetailDto,
  PostTypeDto,
  ReportPostDto,
  RsvpStateResponseDto,
} from '../../dto/exploreDtos';

/** The API's version prefix, as every other client in the app writes it. */
const V1 = '/api/v1';

/**
 * Explore's endpoints as the signed-in person (spec §2.11–2.13, API map §6–7).
 * `request` is auth's `AuthorizedRequest`, which attaches and refreshes the token.
 */
export type ExploreRequest = <T>(request: {
  method: 'GET' | 'POST';
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  retry?: boolean;
}) => Promise<T>;

const query = (params: Record<string, string | number | null>) =>
  Object.entries(params)
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');

type Headers = Record<string, string> | null;

export function createExploreApi(request: ExploreRequest) {
  return {
    /** `bbox` is `west,south,east,north`, under 5° a side. */
    getPins: (bbox: string, type: PostTypeDto | null, headers: Headers) =>
      request<MapPinsDto>({
        method: 'GET',
        path: `${V1}/map/pins?${query({ bbox, type })}`,
        headers: headers ?? undefined,
      }),

    getPost: (postId: string, headers: Headers) =>
      request<PostDetailDto>({
        method: 'GET',
        path: `${V1}/posts/${encodeURIComponent(postId)}`,
        headers: headers ?? undefined,
      }),

    rsvp: (postId: string) =>
      request<RsvpStateResponseDto>({
        method: 'POST',
        path: `${V1}/posts/${encodeURIComponent(postId)}/rsvp`,
      }),

    linkClick: (postId: string) =>
      request<void>({ method: 'POST', path: `${V1}/posts/${encodeURIComponent(postId)}/link-click` }),

    report: (postId: string, body: ReportPostDto) =>
      request<{ id: string }>({
        method: 'POST',
        path: `${V1}/posts/${encodeURIComponent(postId)}/report`,
        body,
      }),

    listInterests: () => request<InterestDto[]>({ method: 'GET', path: `${V1}/interests` }),

    getMeetups: (interestId: string | null, cursor: string | null, limit: number, headers: Headers) =>
      request<FeedPageDto>({
        method: 'GET',
        path: `${V1}/explore/meetups?${query({ interestId, cursor, limit })}`,
        headers: headers ?? undefined,
      }),

    searchCities: (q: string, limit: number) =>
      request<CityDto[]>({ method: 'GET', path: `${V1}/cities?${query({ q, limit })}` }),
  };
}

export type ExploreApi = ReturnType<typeof createExploreApi>;
