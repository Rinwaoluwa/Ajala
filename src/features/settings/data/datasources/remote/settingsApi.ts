import type {
  CityDto,
  DeletionScheduledDto,
  HandleAvailabilityDto,
  MeDto,
  MyPostDto,
  Page,
  PublicProfileDto,
  SessionDto,
  UpdateProfileDto,
  UserSettingsDto,
} from '../../dto/settingsDtos';

/** The API's version prefix, as every other client in the app writes it. */
const V1 = '/api/v1';

/**
 * Settings' endpoints as the signed-in person (spec §3.3–§3.9; API map §10).
 * `request` is auth's `AuthorizedRequest`.
 */
export type SettingsRequest = <T>(request: {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  body?: unknown;
  retry?: boolean;
}) => Promise<T>;

const query = (params: Record<string, string | number>) =>
  Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
const id = encodeURIComponent;

export function createSettingsApi(request: SettingsRequest) {
  return {
    getMe: () => request<MeDto>({ method: 'GET', path: `${V1}/me` }),
    updateMe: (body: UpdateProfileDto) => request<MeDto>({ method: 'PATCH', path: `${V1}/me`, body }),
    /** multipart, field `file` (spec §1.4). */
    uploadAvatar: (file: { uri: string; name: string; type: string }) => {
      const form = new FormData();
      // React Native's FormData takes a file as { uri, name, type }.
      form.append('file', file as unknown as Blob);
      return request<{ avatarUrl: string | null }>({ method: 'POST', path: `${V1}/me/avatar`, body: form });
    },
    /** Throttled to 10 a minute: the caller debounces, and a GET is not retried here. */
    checkHandle: (handle: string) =>
      request<HandleAvailabilityDto>({
        method: 'GET',
        path: `${V1}/handles/availability?${query({ handle })}`,
        retry: false,
      }),
    searchCities: (q: string, limit: number) =>
      request<CityDto[]>({ method: 'GET', path: `${V1}/cities?${query({ q, limit })}` }),

    getSettings: () => request<UserSettingsDto>({ method: 'GET', path: `${V1}/me/settings` }),
    updateSettings: (body: Partial<UserSettingsDto>) =>
      request<UserSettingsDto>({ method: 'PATCH', path: `${V1}/me/settings`, body }),

    listSessions: () => request<SessionDto[]>({ method: 'GET', path: `${V1}/me/sessions` }),
    endSession: (sessionId: string) =>
      request<void>({ method: 'DELETE', path: `${V1}/me/sessions/${id(sessionId)}` }),
    changePassword: (currentPassword: string, newPassword: string) =>
      request<void>({ method: 'POST', path: `${V1}/me/password`, body: { currentPassword, newPassword } }),
    startEmailChange: (newEmail: string) =>
      request<void>({ method: 'POST', path: `${V1}/me/email/change`, body: { newEmail } }),
    confirmEmailChange: (code: string) =>
      request<void>({ method: 'POST', path: `${V1}/me/email/change/confirm`, body: { code } }),
    reauth: (password: string) =>
      request<void>({ method: 'POST', path: `${V1}/me/reauth`, body: { password } }),
    deleteAccount: (reason: string | null) =>
      request<DeletionScheduledDto>({
        method: 'DELETE',
        path: `${V1}/me`,
        body: reason ? { reason } : {},
      }),

    listDrafts: () =>
      request<Page<MyPostDto>>({
        method: 'GET',
        path: `${V1}/me/posts?${query({ status: 'draft', limit: 50 })}`,
      }),
    deletePost: (postId: string) => request<void>({ method: 'DELETE', path: `${V1}/posts/${id(postId)}` }),

    listBlocked: () =>
      request<Page<PublicProfileDto>>({ method: 'GET', path: `${V1}/me/blocks?${query({ limit: 50 })}` }),
    unblock: (userId: string) => request<void>({ method: 'DELETE', path: `${V1}/users/${id(userId)}/block` }),
  };
}

export type SettingsApi = ReturnType<typeof createSettingsApi>;
