import { ListGroup, ListRow } from '@shared/components';

import { SettingsFrame } from '../components/SettingsFrame';
import { settingsCopy } from '../copy';
import { useAccount } from '../hooks/useSettingsData';
import type { SettingsDestination } from '../navigation/routes';

/**
 * Account & security (Figma, light and dark): Email, Change password, Connected
 * accounts; then Sign-in activity and Delete account (red).
 */
export function AccountSecurityScreen({
  onBack,
  onNavigate,
}: {
  onBack: () => void;
  onNavigate: (to: SettingsDestination) => void;
}) {
  const copy = settingsCopy.account;
  const account = useAccount();
  const providers = account.data?.identities
    .filter((i) => i.provider !== 'email')
    .map((i) => settingsCopy.connected[i.provider])
    .join(', ');

  return (
    <SettingsFrame title={copy.title} onBack={onBack}>
      <ListGroup title={copy.section}>
        <ListRow
          title={copy.email}
          subtitle={account.data ? (account.data.email ?? copy.noEmail) : undefined}
          onPress={() => onNavigate('changeEmail')}
        />
        <ListRow title={copy.changePassword} onPress={() => onNavigate('changePassword')} />
        <ListRow
          title={copy.connected}
          subtitle={providers || undefined}
          onPress={() => onNavigate('connected')}
        />
      </ListGroup>
      <ListGroup title={copy.security}>
        <ListRow
          title={copy.signInActivity}
          subtitle={copy.signInActivityBody}
          onPress={() => onNavigate('sessions')}
        />
        <ListRow title={copy.deleteAccount} destructive onPress={() => onNavigate('deleteAccount')} />
      </ListGroup>
    </SettingsFrame>
  );
}
