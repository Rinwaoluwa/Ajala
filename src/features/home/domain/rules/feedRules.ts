import type { FeedFilter } from '../entities/Feed';

/**
 * The filter pills, in the Home design's order (22 Nov): All, Events, Meetups,
 * Trips, Groups. They are the API's post types. The design calls the fourth
 * "Trips"; it is the Plan type, and stays "Plans" here, as it is everywhere
 * else in the app (the create sheet, the paywall) and because Trips is already
 * the name of a tab.
 */
export const FEED_FILTERS: readonly { value: FeedFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'event', label: 'Events' },
  { value: 'meetup', label: 'Meetups' },
  { value: 'plan', label: 'Plans' },
  { value: 'group', label: 'Groups' },
];

export const FEED_PAGE_SIZE = 20;
