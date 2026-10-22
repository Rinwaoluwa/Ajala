import {
  getLocationPermission,
  openAppSettings,
  requestLocationPermission,
  type LocationPermission,
} from '@core/location/deviceLocation';

import type { LocationAccess, LocationAccessRepository } from '../domain/LocationAccess';

const toAccess = (p: LocationPermission): LocationAccess =>
  p === 'granted' ? 'granted' : p === 'blocked' ? 'blocked' : 'askable';

export const locationAccessRepository: LocationAccessRepository = {
  current: async () => toAccess(await getLocationPermission()),
  request: async () => toAccess(await requestLocationPermission()),
  openSettings: openAppSettings,
};
