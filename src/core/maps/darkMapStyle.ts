/**
 * Google Maps in the dark scheme: Night ground, deep roads, muted labels — the
 * dark Explore frame. Businesses and transit are hidden, so only the posts' pins
 * stand out.
 */
export const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0D1715' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8A9A97' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0D1715' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#24302E' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0D1715' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2E3B39' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#06100E' }] },
];

/**
 * Google Maps in the light scheme: Google's own look, with businesses and transit
 * hidden as in the dark style. Google Maps has no switch for points of interest,
 * so a style is the only way to turn them off.
 */
export const lightMapStyle = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];
