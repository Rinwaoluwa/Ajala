import type { TravelStyle } from '../entities/Settings';

/**
 * The 36 travel styles `extras.travelStyles` takes (spec §6), as the API's slugs
 * with the words the design shows, in the design's order.
 *
 * The profile feature keeps the same labels for profile setup, but does not
 * export them, so Settings keeps its own copy. If the two drift, profile setup
 * is the design's reference.
 */
export const TRAVEL_STYLES: readonly { value: TravelStyle; label: string }[] = [
  { value: 'family', label: 'Family' },
  { value: 'solo', label: 'Solo' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'local_life', label: 'Local life' },
  { value: 'rail_travel', label: 'Rail travel' },
  { value: 'diving', label: 'Diving' },
  { value: 'art_lover', label: 'Art lover' },
  { value: 'backpacker', label: 'Backpacker' },
  { value: 'skiing', label: 'Skiing' },
  { value: 'cruise', label: 'Cruise' },
  { value: 'cycling', label: 'Cycling' },
  { value: 'eco_travel', label: 'Eco travel' },
  { value: 'safari', label: 'Safari' },
  { value: 'nightlife', label: 'Nightlife' },
  { value: 'foodie', label: 'Foodie' },
  { value: 'beach', label: 'Beach' },
  { value: 'festivals', label: 'Festivals' },
  { value: 'spiritual', label: 'Spiritual' },
  { value: 'road_trip', label: 'Road trip' },
  { value: 'mountains', label: 'Mountains' },
  { value: 'culture', label: 'Culture' },
  { value: 'hiking', label: 'Hiking' },
  { value: 'surfing', label: 'Surfing' },
  { value: 'sailing', label: 'Sailing' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'photography', label: 'Photography' },
  { value: 'adventurer', label: 'Adventurer' },
  { value: 'budget', label: 'Budget' },
  { value: 'staycation', label: 'Staycation' },
  { value: 'city_break', label: 'City break' },
  { value: 'history', label: 'History' },
  { value: 'digital_nomad', label: 'Digital nomad' },
  { value: 'snow_escape', label: 'Snow escape' },
  { value: 'glamping', label: 'Glamping' },
  { value: 'couples', label: 'Couples' },
  { value: 'camping', label: 'Camping' },
];

const KNOWN = new Set<string>(TRAVEL_STYLES.map((s) => s.value));

/** Whether the API's list has this slug. Anything else would be refused on save. */
export const isTravelStyle = (value: unknown): value is TravelStyle =>
  typeof value === 'string' && KNOWN.has(value);

/** "local_life" → "Local life". */
export const travelStyleLabel = (value: TravelStyle) =>
  TRAVEL_STYLES.find((s) => s.value === value)?.label ?? value;
