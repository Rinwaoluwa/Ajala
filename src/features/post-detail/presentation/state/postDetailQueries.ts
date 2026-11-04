import type { AttendeeState } from '../../domain/entities/PostDetail';

/** The post page's TanStack Query keys, under `postDetail` so they never meet another feature's. */
export const postDetailKeys = {
  post: (id: string) => ['postDetail', 'post', id] as const,
  attendees: (id: string, state: AttendeeState) => ['postDetail', 'attendees', id, state] as const,
  attendeesOf: (id: string) => ['postDetail', 'attendees', id] as const,
  viewer: ['postDetail', 'viewer'] as const,
  comments: (id: string) => ['postDetail', 'comments', id] as const,
};

/** Lists a post shows up in; refreshed when it is cancelled or deleted. Owned by other features. */
export const LISTS_SHOWING_POSTS = [['feed'], ['explore'], ['trips']] as const;
