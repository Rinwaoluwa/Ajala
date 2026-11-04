import type { TripsTab } from '../../domain/entities/Trip';

/** The Trips feature's TanStack Query keys, under `trips`. */
export const tripsKeys = {
  all: ['trips'] as const,
  list: (tab: Exclude<TripsTab, 'requests'>) => ['trips', tab] as const,
};
