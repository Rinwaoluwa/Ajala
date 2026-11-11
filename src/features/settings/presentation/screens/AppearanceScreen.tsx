import { View } from 'react-native';

import { haptics } from '@shared/feedback/haptics';
import { ListGroup, ListRow, Text } from '@shared/components';
import { setAppearance, useAppearancePreference, type AppearancePreference } from '@shared/state/appearance';

import { SettingsFrame } from '../components/SettingsFrame';
import { settingsCopy } from '../copy';

/**
 * Appearance (Figma "Choose your theme"): System, Light or Dark, the chosen one
 * ticked. Kept on this phone and applied at once, app-wide; the colours change
 * in place (the app's own colour transitions carry it, nothing reloads).
 */
const OPTIONS: AppearancePreference[] = ['system', 'light', 'dark'];

export function AppearanceScreen({ onBack }: { onBack: () => void }) {
  const copy = settingsCopy.appearance;
  const current = useAppearancePreference();
  return (
    <SettingsFrame title={copy.title} onBack={onBack}>
      <View style={{ gap: 6 }}>
        <Text variant="headingMd" accessibilityRole="header">
          {copy.heading}
        </Text>
        <Text variant="bodySm" tone="muted">
          {copy.body}
        </Text>
      </View>
      <View accessibilityRole="radiogroup">
        <ListGroup title={copy.theme}>
          {OPTIONS.map((option) => (
            <ListRow
              key={option}
              title={copy[option]}
              subtitle={copy[`${option}Body` as const]}
              checked={current === option}
              onPress={() => {
                if (option !== current) haptics.select();
                setAppearance(option);
              }}
            />
          ))}
        </ListGroup>
      </View>
    </SettingsFrame>
  );
}
