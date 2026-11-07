import type { ActivityPageDto, PublicProfileDto, ReportUserDto } from '../../dto/profileViewDtos';
import type { ProfileRequest } from './profileApi';

/** The API's version prefix, as every other client in the app writes it. */
const V1 = '/api/v1';

const query = (params: Record<string, string | number | null>) =>
  Object.entries(params)
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');

/**
 * The profile pages' endpoints (spec §2.14, §2.16, §3.12; API map §9). Lists
 * send `X-Client-Location` when there is one, so cards carry distances.
 */
export function createProfileViewApi(request: ProfileRequest) {
  const id = encodeURIComponent;
  return {
    getMyAttended: (cursor: string | null, limit: number, headers?: Record<string, string>) =>
      request<ActivityPageDto>({
        method: 'GET',
        path: `${V1}/me/attended?${query({ cursor, limit })}`,
        headers,
      }),

    getMySaved: (
      type: 'all' | 'meetup' | 'event' | 'plan' | 'group',
      cursor: string | null,
      limit: number,
      headers?: Record<string, string>,
    ) =>
      request<ActivityPageDto>({
        method: 'GET',
        path: `${V1}/me/saved?${query({ type, cursor, limit })}`,
        headers,
      }),

    getMyRsvps: (
      state: 'going' | 'requested',
      cursor: string | null,
      limit: number,
      headers?: Record<string, string>,
    ) =>
      request<ActivityPageDto>({
        method: 'GET',
        path: `${V1}/me/rsvps?${query({ state, cursor, limit })}`,
        headers,
      }),

    getPerson: (userId: string) =>
      request<PublicProfileDto>({ method: 'GET', path: `${V1}/users/${id(userId)}` }),

    getPersonPosts: (
      userId: string,
      cursor: string | null,
      limit: number,
      headers?: Record<string, string>,
    ) =>
      request<ActivityPageDto>({
        method: 'GET',
        path: `${V1}/users/${id(userId)}/posts?${query({ cursor, limit })}`,
        headers,
      }),

    getPersonAttended: (
      userId: string,
      cursor: string | null,
      limit: number,
      headers?: Record<string, string>,
    ) =>
      request<ActivityPageDto>({
        method: 'GET',
        path: `${V1}/users/${id(userId)}/attended?${query({ cursor, limit })}`,
        headers,
      }),

    /** Empty unless they turned on `sharePlans`. */
    getPersonPlans: (
      userId: string,
      cursor: string | null,
      limit: number,
      headers?: Record<string, string>,
    ) =>
      request<ActivityPageDto>({
        method: 'GET',
        path: `${V1}/users/${id(userId)}/plans?${query({ cursor, limit })}`,
        headers,
      }),

    block: (userId: string) =>
      request<void>({
        method: 'POST',
        path: `${V1}/users/${id(userId)}/block`,
      }),
    unblock: (userId: string) =>
      request<void>({
        method: 'DELETE',
        path: `${V1}/users/${id(userId)}/block`,
      }),

    report: (userId: string, body: ReportUserDto) =>
      request<{ id: string }>({ method: 'POST', path: `${V1}/users/${id(userId)}/report`, body }),
  };
}
