import { ListGroup, ListRow, NoteCard, SkeletonBlock, SkeletonPulse, Text } from '@shared/components';

import type { IdentityProvider } from '../../domain/entities/Settings';
import { LoadFailed } from '../components/LoadFailed';
import { SettingsFrame } from '../components/SettingsFrame';
import { settingsCopy } from '../copy';
import { useAccount } from '../hooks/useSettingsData';

/**
 * Connected accounts: the ways this account signs in (`identities` on `GET /me`).
 * Another is connected by signing in with it; there is no unlink call yet
 * (API map §12).
 */
export function ConnectedAccountsScreen({ onBack }: { onBack: () => void }) {
  const copy = settingsCopy.connected;
  const account = useAccount();
  const names: Record<IdentityProvider, string> = {
    email: copy.email,
    google: copy.google,
    apple: copy.apple,
  };

  return (
    <SettingsFrame title={copy.title} onBack={onBack}>
      <Text variant="bodySm" tone="muted">
        {copy.intro}
      </Text>
      {account.isError ? (
        <LoadFailed onRetry={() => void account.refetch()} />
      ) : !account.data ? (
        <SkeletonPulse>
          <SkeletonBlock height={120} radius={16} />
        </SkeletonPulse>
      ) : (
        <ListGroup>
          {account.data.identities.map((i) => (
            <ListRow
              key={i.provider}
              title={names[i.provider]}
              subtitle={i.verifiedAt ? copy.verified : copy.notVerified}
            />
          ))}
        </ListGroup>
      )}
      <NoteCard title={copy.title} body={copy.note} />
    </SettingsFrame>
  );
}
