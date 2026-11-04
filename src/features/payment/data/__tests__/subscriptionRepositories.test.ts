import { describe, expect, it } from '@jest/globals';

import { liveSubscriptionRepository } from '../repositories/subscriptionRepositories';

describe('the plan', () => {
  it('is free: there is no subscription backend yet', async () => {
    expect(await liveSubscriptionRepository.getTier()).toBe('free');
  });
});
