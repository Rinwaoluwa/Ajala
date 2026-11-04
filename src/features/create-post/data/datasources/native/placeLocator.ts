import { geocodePlace } from '@core/location/deviceLocation';

import type { PlaceLocator } from '../../../domain/repositories/PostRepository';

/** The phone's own geocoder: a typed meeting point becomes a pin, with no places SDK. */
export const devicePlaceLocator: PlaceLocator = { locate: geocodePlace };
