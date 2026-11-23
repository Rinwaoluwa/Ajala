import { describe, expect, it } from '@jest/globals';

import type { ActivityCardDto } from '../dto/profileViewDtos';
import { toActivity } from '../mappers/profileViewMappers';

const card = (over: Partial<ActivityCardDto>): ActivityCardDto =>
  ({ id: 'p1', type: 'meetup', title: 'A post', ...over }) as ActivityCardDto;

describe('why a card is locked', () => {
  it('is not locked unless the server says so', () => {
    expect(toActivity(card({})).lockReason).toBeNull();
    expect(toActivity(card({ locked: false, lockReason: 'distance' })).lockReason).toBeNull();
  });

  it('reads a post outside the reader’s area as that', () => {
    expect(toActivity(card({ locked: true, lockReason: 'distance' })).lockReason).toBe('distance');
  });

  it('reads a locked Plan as a Plan, even when the server gives distance as the reason', () => {
    // A Plan needs Pro wherever it is: it must never say "outside your area".
    expect(toActivity(card({ type: 'plan', locked: true, lockReason: 'distance' })).lockReason).toBe('plan');
    expect(toActivity(card({ type: 'plan', locked: true, lockReason: 'plan' })).lockReason).toBe('plan');
  });

  it('reads a lock with no reason as a Plan’s, as the API first sent it', () => {
    expect(toActivity(card({ type: 'plan', locked: true })).lockReason).toBe('plan');
  });
});
