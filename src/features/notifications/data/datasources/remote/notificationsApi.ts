import type {
  InboxPageDto,
  MarkReadDto,
  RegisterDeviceDto,
  UnregisterDeviceDto,
} from '../../dto/notificationsDtos';

/** The API's version prefix, as every other client in the app writes it. */
const V1 = '/api/v1';

/** The inbox and push-device endpoints as the signed-in person (spec §2.10, §2.17, §3.5). `request` is auth's `AuthorizedRequest`. */
export type NotificationsRequest = <T>(request: {
  method: 'GET' | 'POST';
  path: string;
  body?: unknown;
}) => Promise<T>;

const query = (params: Record<string, string | number | boolean | null>) =>
  Object.entries(params)
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');

export function createNotificationsApi(request: NotificationsRequest) {
  return {
    list: (unread: boolean, cursor: string | null, limit: number) =>
      request<InboxPageDto>({
        method: 'GET',
        path: `${V1}/me/notifications?${query({ unread, cursor, limit })}`,
      }),

    /** 204. */
    markRead: (body: MarkReadDto) =>
      request<void>({
        method: 'POST',
        path: `${V1}/me/notifications/read`,
        body,
      }),

    /** 204, and safe to repeat: the API registers or refreshes. */
    registerDevice: (body: RegisterDeviceDto) =>
      request<void>({
        method: 'POST',
        path: `${V1}/me/devices`,
        body,
      }),

    /** 204. */
    unregisterDevice: (body: UnregisterDeviceDto) =>
      request<void>({
        method: 'POST',
        path: `${V1}/me/devices/unregister`,
        body,
      }),
  };
}
