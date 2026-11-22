/**
 * Map geometry the app works in, free of any map SDK so it can be tested and
 * used by a repository: a visible region, and the box the API asks pins for.
 */

/** What the map shows: its centre and how many degrees it spans each way. */
export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

/** `west,south,east,north`, as `GET /map/pins?bbox=` takes it (spec §2.11). */
export type Bbox = { west: number; south: number; east: number; north: number };

/**
 * The API refuses a box 5° or more on a side (400). Zoomed out past that, the
 * box is shrunk around the centre to just under it: the pins nearest the middle
 * still come back, rather than none.
 */
export const MAX_BBOX_SPAN = 4.99;

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

/** The box a region covers, clamped to the API's limit and to the globe. */
export function regionToBbox(region: MapRegion, maxSpan = MAX_BBOX_SPAN): Bbox {
  const halfLat = Math.min(Math.abs(region.latitudeDelta), maxSpan) / 2;
  const halfLng = Math.min(Math.abs(region.longitudeDelta), maxSpan) / 2;
  const round = (n: number) => Math.round(n * 1e4) / 1e4;
  return {
    west: round(clamp(region.longitude - halfLng, -180, 180)),
    south: round(clamp(region.latitude - halfLat, -90, 90)),
    east: round(clamp(region.longitude + halfLng, -180, 180)),
    north: round(clamp(region.latitude + halfLat, -90, 90)),
  };
}

export const bboxParam = (b: Bbox) => `${b.west},${b.south},${b.east},${b.north}`;

/**
 * A city-sized view around a point: about 9 km tall at the default span, the
 * scale the Explore designs draw pins at.
 */
export function regionAround(latitude: number, longitude: number, span = 0.08): MapRegion {
  return { latitude, longitude, latitudeDelta: span, longitudeDelta: span };
}

/**
 * The view that frames a set of points (the pins of a chosen interest), with
 * room around them so none sits on the edge. One point, or points on top of
 * each other, get a neighbourhood-sized view (`minSpan`) rather than the
 * closest zoom there is.
 *
 * `around` keeps it local: with it, only the points within `reach` degrees of
 * it are framed (about 110 km a degree), so one far-away match does not pull
 * the map out to a continent. If none is that close, all are framed.
 *
 * Null with no points.
 */
export function regionCovering(
  points: readonly { latitude: number; longitude: number }[],
  options: { around?: { latitude: number; longitude: number } | null; reach?: number; minSpan?: number } = {},
): MapRegion | null {
  const { around = null, reach = 1.5, minSpan = 0.03 } = options;
  const near = around
    ? points.filter(
        (p) => Math.abs(p.latitude - around.latitude) <= reach && Math.abs(p.longitude - around.longitude) <= reach,
      )
    : points;
  const framed = near.length ? near : points;
  if (!framed.length) return null;
  let south = Infinity;
  let north = -Infinity;
  let west = Infinity;
  let east = -Infinity;
  for (const p of framed) {
    south = Math.min(south, p.latitude);
    north = Math.max(north, p.latitude);
    west = Math.min(west, p.longitude);
    east = Math.max(east, p.longitude);
  }
  // A third again as wide as the points, so pins and their labels clear the edges.
  const MARGIN = 1.35;
  return {
    latitude: (south + north) / 2,
    longitude: (west + east) / 2,
    latitudeDelta: Math.max((north - south) * MARGIN, minSpan),
    longitudeDelta: Math.max((east - west) * MARGIN, minSpan),
  };
}
