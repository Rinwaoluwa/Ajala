import { LoadFailedState } from '@shared/components';

import { settingsCopy } from '../copy';

/**
 * What a Settings screen shows when its read failed and nothing is cached: the
 * broken-charger picture (a Settings read that fails is nearly always the
 * connection), the reason and a retry.
 */
export function LoadFailed({ onRetry, network = true }: { onRetry: () => void; network?: boolean }) {
  return (
    <LoadFailedState
      kind={network ? 'network' : 'server'}
      title={settingsCopy.loadFailed}
      action={{ label: settingsCopy.retry, onPress: onRetry, variant: 'primary' }}
    />
  );
}
