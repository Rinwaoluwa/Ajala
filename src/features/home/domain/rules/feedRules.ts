import type { FeedFilter } from '../entities/Feed';

/**
 * The filter pills, in order. The design's labels (Activities, Trips, Events,
 * Food) do not map onto the API's post types, so the pills are the types
 * themselves — agreed with product (API map §4, §12).
 */
export const FEED_FILTERS: readonly { value: FeedFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'meetup', label: 'Meetups' },
  { value: 'event', label: 'Events' },
  { value: 'plan', label: 'Plans' },
  { value: 'group', label: 'Groups' },
];

export const FEED_PAGE_SIZE = 20;
