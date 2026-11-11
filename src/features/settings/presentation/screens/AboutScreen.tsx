import { View } from 'react-native';

import { getInstalledAppVersion } from '@core/config/appVersion';
import { openInApp } from '@core/links/openInApp';
import { ListGroup, ListRow, Logo, Text } from '@shared/components';

import { LoadFailed } from '../components/LoadFailed';
import { SettingsFrame } from '../components/SettingsFrame';
import { settingsCopy } from '../copy';
import { useSupportLinks } from '../hooks/useSettingsData';

/**
 * About AJALA: the mark, this build's version, and the policies from `GET
 * /app/config`, each opened inside the app (`openInApp`) rather than in Safari.
 */
export function AboutScreen({ onBack }: { onBack: () => void }) {
  const copy = settingsCopy.about;
  const support = useSupportLinks();
  const version = getInstalledAppVersion();
  const open = (url: string) => void openInApp(url);

  return (
    <SettingsFrame title={copy.title} onBack={onBack}>
      <View style={{ alignItems: 'center', gap: 12, paddingVertical: 12 }}>
        <Logo tone="brand" />
        {version ? (
          <Text variant="bodySm" tone="muted">
            {copy.version(version)}
          </Text>
        ) : null}
      </View>
      {support.isError ? (
        <LoadFailed onRetry={() => void support.refetch()} />
      ) : support.data ? (
        <ListGroup>
          <ListRow title={copy.terms} onPress={() => open(support.data.termsUrl)} />
          <ListRow title={copy.privacy} onPress={() => open(support.data.privacyUrl)} />
          <ListRow title={copy.faq} onPress={() => open(support.data.faqUrl)} />
          <ListRow
            title={copy.contact(support.data.supportEmail)}
            onPress={() => open(`mailto:${support.data.supportEmail}`)}
          />
        </ListGroup>
      ) : null}
    </SettingsFrame>
  );
}
