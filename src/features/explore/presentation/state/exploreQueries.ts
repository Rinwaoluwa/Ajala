import type { Bbox, PostType } from '../../domain/entities/Explore';

/** Rounded to about 1 km, so a nudge of the map does not ask again. */
const boxKey = (b: Bbox) => [b.west, b.south, b.east, b.north].map((n) => n.toFixed(2)).join(',');

/** The explore feature's TanStack Query keys, all under `explore`. */
export const exploreKeys = {
  pins: (bbox: Bbox, type: PostType | null) => ['explore', 'pins', boxKey(bbox), type ?? 'all'] as const,
  post: (postId: string) => ['explore', 'post', postId] as const,
  interests: ['explore', 'interests'] as const,
  meetups: (interestId: string | null) => ['explore', 'meetups', interestId ?? 'all'] as const,
  places: (query: string) => ['explore', 'places', query] as const,
  rsvpNotice: ['explore', 'rsvpNotice'] as const,
};
