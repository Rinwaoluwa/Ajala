import { isApiError } from '@core/api/ApiError';

import type { Subscription } from '../../domain/entities/Subscription';
import { SubscriptionError } from '../../domain/entities/SubscriptionError';
import type { MySubscriptionDto } from '../dto/subscriptionDtos';

export const toSubscription = (dto: MySubscriptionDto): Subscription => ({
  subscribed: dto.subscribed === true,
  platform: dto.platform ?? null,
  status: dto.status ?? null,
  currentPeriodEnd: dto.currentPeriodEnd ?? null,
  autoRenew: dto.autoRenew === true,
  manage: dto.manage ?? null,
});

/**
 * By the API's code (spec §5), never its message. A 404 means "no web
 * subscription" only from the portal, so `context` says which call failed.
 */
export function toSubscriptionError(e: unknown, context?: 'portal'): SubscriptionError {
  if (e instanceof SubscriptionError) return e;
  if (isApiError(e)) {
    switch (e.code) {
      case 'SERVICE_UNAVAILABLE':
        return new SubscriptionError('unavailable', e.message);
      case 'NOT_FOUND':
        return new SubscriptionError(context === 'portal' ? 'noWebSubscription' : 'unknown', e.message);
      case 'NETWORK':
      case 'TIMEOUT':
        return new SubscriptionError('network', e.message);
      case 'UNAUTHORIZED':
        return new SubscriptionError('sessionExpired', e.message);
      default:
        return new SubscriptionError('unknown', e.message);
    }
  }
  const code = (e as { code?: unknown } | null)?.code;
  return new SubscriptionError(code === 'sessionExpired' ? 'sessionExpired' : 'unknown');
}
