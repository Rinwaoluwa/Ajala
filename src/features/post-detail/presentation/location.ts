import type { PostDetail } from '../domain/entities/PostDetail';

/**
 * The post page's Location row and the Maps link behind it, from the place
 * fields (spec §1.6): `placeName` is the venue or meeting point (the city's
 * name when the host gave none), `formattedAddress` Google's address for a
 * picked place, `localityLabel` the city and country ("Lagos, Nigeria").
 */

type Place = Pick<PostDetail, 'title' | 'placeName' | 'placeId' | 'formattedAddress' | 'localityLabel' | 'lat' | 'lng'>;

/**
 * The row's two lines: the place's name, then the most useful line under it —
 * its address, or for a dropped pin the city around it. A line that only
 * repeats the one above is left out. Null when the post has no place at all.
 */
export function locationLines(post: Place): { value: string; note: string | null } | null {
  const name = post.placeName?.trim() || null;
  const address = post.formattedAddress?.trim() || null;
  const locality = post.localityLabel?.trim() || null;
  const value = name ?? address ?? locality;
  if (!value) return null;
  const note = [address, locality].find((line) => line !== null && line !== value) ?? null;
  return { value, note };
}

/**
 * Where the row opens. iOS opens Apple Maps at the pin, labelled. Android opens
 * the picked Google place itself when there is one (Google Maps understands its
 * place id; the URL also works in a browser), else the pin through `geo:`.
 * Without coordinates, a search for the words.
 */
export function mapsUrl(post: Place, os: 'ios' | 'android' | string): string {
  const words = locationLines(post);
  const label = [words?.value, words?.note].filter(Boolean).join(', ') || post.title;
  const q = encodeURIComponent(label);
  const pinned = post.lat !== null && post.lng !== null;
  if (os === 'ios') {
    return pinned ? `http://maps.apple.com/?ll=${post.lat},${post.lng}&q=${q}` : `http://maps.apple.com/?q=${q}`;
  }
  if (post.placeId) {
    return `https://www.google.com/maps/search/?api=1&query=${q}&query_place_id=${encodeURIComponent(post.placeId)}`;
  }
  return pinned ? `geo:${post.lat},${post.lng}?q=${post.lat},${post.lng}(${q})` : `geo:0,0?q=${q}`;
}
