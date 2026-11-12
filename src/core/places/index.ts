/**
 * Google places for the features: search a city or a place, look one up, and
 * find the city the phone is in. See README.md.
 */
export {
  OWN_AREA_RADIUS_M,
  cityAt,
  endPlacesSession,
  placeDetails,
  searchCities,
  searchDestinations,
  searchPlaces,
} from './places';
export {
  PlacesError,
  isPlacesError,
  type CityRef,
  type LatLng,
  type PlaceDetails,
  type PlaceSuggestion,
  type PlacesErrorKind,
} from './placesTypes';
