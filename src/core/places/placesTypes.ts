/**
 * What the places module hands the features. Plain data only, so a feature's
 * Data layer can map it without knowing Google is behind it.
 */

export type LatLng = { lat: number; lng: number };

/** One row of a place picker, as autocomplete suggests it. */
export type PlaceSuggestion = {
  /** The Google place id the API takes (`homePlaceId`, `placeId`, teleport). */
  placeId: string;
  /** The bold line: "Lagos", "Terra Kulture". */
  primaryText: string;
  /** The line under it: "Nigeria", "Victoria Island, Lagos, Nigeria". Empty when Google gives none. */
  secondaryText: string;
};

/** A picked place, with what a post's pin and address line need. */
export type PlaceDetails = {
  placeId: string;
  name: string;
  /** Google's formatted address; empty when it has none. */
  address: string;
  lat: number;
  lng: number;
};

/** A city, as "detect my city" finds it. */
export type CityRef = { placeId: string; name: string };

/**
 * Why a place lookup failed, so the UI can say "Place search isn't available
 * right now" without knowing Google's error format.
 *
 * - `unavailable`: no key in this build, Google answered with an error, or the
 *   phone's geocoder had nothing to say. Trying again later may help.
 * - `network`: the request never got an answer (offline, timed out).
 * - `denied`: Google refused the key (the Places API is not enabled on it, or
 *   the app restriction does not match this build). Only a config fix helps.
 */
export type PlacesErrorKind = 'unavailable' | 'network' | 'denied';

export class PlacesError extends Error {
  readonly kind: PlacesErrorKind;

  constructor(kind: PlacesErrorKind, message: string) {
    super(message);
    this.name = 'PlacesError';
    this.kind = kind;
    // The screens show one friendly line for every failure, so in development the
    // real reason (no key, Google's answer, no network) goes to the log as well.
    if (__DEV__) console.warn(`[places] ${kind}: ${message}`);
  }
}

export const isPlacesError = (e: unknown): e is PlacesError => e instanceof PlacesError;
