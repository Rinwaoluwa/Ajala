import type {
  AvatarDto,
  HandleAvailabilityDto,
  InterestDto,
  MeDto,
  UpdateProfileDto,
} from '../../dto/profileDtos';

/** The API's version prefix, as every other client in the app writes it. */
const V1 = '/api/v1';

/**
 * The profile's endpoints, as the signed-in person (docs/api: spec §3.3, §3.4,
 * §3.13; API map §3). There are no city endpoints any more: cities come from
 * Google places (`@core/places`), called by the repository. `request` is auth's `AuthorizedRequest`, which attaches and
 * refreshes the token, so nothing here handles one.
 */

export type ProfileRequest = <T>(request: {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  body?: unknown;
  retry?: boolean;
  headers?: Record<string, string>;
}) => Promise<T>;

const query = (params: Record<string, string | number>) =>
  Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');

export function createProfileApi(request: ProfileRequest) {
  return {
    getMe: () => request<MeDto>({ method: 'GET', path: `${V1}/me` }),

    updateMe: (body: UpdateProfileDto) => request<MeDto>({ method: 'PATCH', path: `${V1}/me`, body }),

    /** multipart, field `file` (§1.4). */
    uploadAvatar: (file: { uri: string; name: string; type: string }) => {
      const form = new FormData();
      // React Native's FormData takes a file as { uri, name, type }.
      form.append('file', file as unknown as Blob);
      return request<AvatarDto>({
        method: 'POST',
        path: `${V1}/me/avatar`,
        body: form,
      });
    },

    removeAvatar: () => request<void>({ method: 'DELETE', path: `${V1}/me/avatar` }),

    listInterests: () => request<InterestDto[]>({ method: 'GET', path: `${V1}/interests` }),

    /** Throttled to 10 a minute: the caller debounces, and a GET is not retried here. */
    checkHandle: (handle: string) =>
      request<HandleAvailabilityDto>({
        method: 'GET',
        path: `${V1}/handles/availability?${query({ handle })}`,
        retry: false,
      }),
  };
}

export type ProfileApi = ReturnType<typeof createProfileApi>;
