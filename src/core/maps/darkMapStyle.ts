/**
 * Google Maps (Android) in the dark scheme: Night ground, deep roads, muted
 * labels — the dark Explore frame. Apple Maps follows the system appearance by
 * itself, so iOS needs no style.
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
