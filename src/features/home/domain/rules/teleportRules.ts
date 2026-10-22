/**
 * Teleport's "Popular" cities, as the picker design lists them, with the country
 * each flag comes from. They are shown, not fetched: Teleport cannot switch the
 * feed yet (API map §12), so they lead to the paywall rather than to a city id.
 */
export const POPULAR_TELEPORT_CITIES: readonly { name: string; countryCode: string }[] = [
  { name: 'New York', countryCode: 'US' },
  { name: 'London', countryCode: 'GB' },
  { name: 'Cairo', countryCode: 'EG' },
  { name: 'Ontario', countryCode: 'CA' },
  { name: 'Abuja', countryCode: 'NG' },
  { name: 'Nova Scotia', countryCode: 'CA' },
  { name: 'Nairobi', countryCode: 'KE' },
  { name: 'Paris', countryCode: 'FR' },
  { name: 'Dubai', countryCode: 'AE' },
  { name: 'Arizona', countryCode: 'US' },
  { name: 'Accra', countryCode: 'GH' },
];
