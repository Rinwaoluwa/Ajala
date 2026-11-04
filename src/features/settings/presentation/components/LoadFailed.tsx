import { EmptyState } from '@shared/components';

import { settingsCopy } from '../copy';

/** What a Settings screen shows when its read failed: the reason and a retry. */
export function LoadFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      title={settingsCopy.loadFailed}
      action={{ label: settingsCopy.retry, onPress: onRetry, variant: 'primary' }}
    />
  );
}
