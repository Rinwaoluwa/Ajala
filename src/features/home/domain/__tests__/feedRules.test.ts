import { describe, expect, it } from '@jest/globals';

import { FEED_FILTERS } from '../rules/feedRules';

describe('feed rules', () => {
  it('offers the API post types as filters, All first', () => {
    expect(FEED_FILTERS.map((f) => f.value)).toEqual(['all', 'meetup', 'event', 'plan', 'group']);
  });
});
