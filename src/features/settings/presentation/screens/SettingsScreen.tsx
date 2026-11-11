import { Alert, Linking } from 'react-native';

import { openInApp } from '@core/links/openInApp';
import { useSignOut } from '@features/auth';
import { ListGroup, ListRow } from '@shared/components';
import { useAppearancePreference } from '@shared/state/appearance';

import { displayNameOf } from '../../domain/rules/settingsRules';
import { ProfileChip } from '../components/ProfileChip';
import { SettingsFrame } from '../components/SettingsFrame';
import { settingsCopy } from '../copy';
import { useAccount, useDrafts, useSupportLinks } from '../hooks/useSettingsData';
import type { SettingsDestination } from '../navigation/routes';
import { haptics } from '@shared/feedback/haptics';

/**
 * Settings (Figma Settings, light and dark): who is signed in, then ACCOUNT,
 * PREFERENCES and SUPPORT. The Drafts row counts `GET /me/posts?status=draft`;
 * Appearance shows the theme chosen on this phone. Log out asks first.
 */
export type SettingsScreenProps = {
  onBack: () => void;
  onNavigate: (to: SettingsDestination) => void;
  onOpenProfile: () => void;
};

export function SettingsScreen({ onBack, onNavigate, onOpenProfile }: SettingsScreenProps) {
  const copy = settingsCopy.hub;
  const account = useAccount();
  const drafts = useDrafts();
  const support = useSupportLinks();
  const appearance = useAppearancePreference();
  const signOut = useSignOut();

  const logOut = () =>
    haptics.warning();
    Alert.alert(copy.logOutConfirm, copy.logOutBody, [
      { text: copy.cancel, style: 'cancel' },
      { text: copy.logOut, style: 'destructive', onPress: () => void signOut() },
    ]);

  const help = () => {
    const links = support.data;
    if (!links) return;
    // The FAQ opens inside the app; if it cannot, the mail app is the way to reach support.
    void openInApp(links.faqUrl).catch(() => Linking.openURL(`mailto:${links.supportEmail}`));
  };

  return (
    <SettingsFrame title={copy.title} onBack={onBack}>
      <ProfileChip
        loading={account.isPending}
        name={account.data ? displayNameOf(account.data) : ''}
        handle={account.data?.handle}
        avatarUrl={account.data?.avatarUrl ?? null}
        onPress={account.data ? onOpenProfile : undefined}
        accessibilityLabel={copy.openProfile}
      />
      <ListGroup title={copy.account}>
        <ListRow
          title={copy.editProfile}
          subtitle={copy.editProfileBody}
          onPress={() => onNavigate('editProfile')}
        />
        <ListRow
          title={copy.accountSecurity}
          subtitle={copy.accountSecurityBody}
          onPress={() => onNavigate('account')}
        />
        <ListRow
          title={copy.drafts}
          subtitle={copy.draftsBody}
          value={drafts.drafts ? String(drafts.drafts.length) : undefined}
          onPress={() => onNavigate('drafts')}
        />
      </ListGroup>
      <ListGroup title={copy.preferences}>
        <ListRow
          title={copy.notifications}
          subtitle={copy.notificationsBody}
          onPress={() => onNavigate('notifications')}
        />
        <ListRow
          title={copy.appearance}
          subtitle={copy.appearanceBody}
          value={settingsCopy.appearance[appearance]}
          hideChevron
          onPress={() => onNavigate('appearance')}
        />
        <ListRow title={copy.privacy} subtitle={copy.privacyBody} onPress={() => onNavigate('privacy')} />
      </ListGroup>
      <ListGroup title={copy.support}>
        <ListRow title={copy.help} onPress={support.data ? help : undefined} />
        <ListRow title={copy.about} onPress={() => onNavigate('about')} />
        <ListRow title={copy.logOut} destructive onPress={logOut} />
      </ListGroup>
    </SettingsFrame>
  );
}
