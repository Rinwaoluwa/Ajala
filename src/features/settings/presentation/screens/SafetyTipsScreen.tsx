import { View, useColorScheme } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Text, enterRise } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

import { SettingsFrame } from '../components/SettingsFrame';
import { settingsCopy } from '../copy';

/**
 * Safety Tips (Figma, light and dark): the intro, a shield, and four cards with
 * caps titles. The shield is teal on light and Marigold on dark, as drawn. The
 * cards rise in one after another (60ms apart).
 */
export function SafetyTipsScreen({ onBack }: { onBack: () => void }) {
  const theme = useTheme();
  const copy = settingsCopy.tips;
  const dark = useColorScheme() === 'dark';
  const mark = dark ? theme.accent : theme.primary;

  return (
    <SettingsFrame title={copy.title} onBack={onBack}>
      <Text variant="bodyLg" tone="muted">
        {copy.intro}
      </Text>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Svg width={44} height={48} viewBox="0 0 44 48">
          <Path
            d="M22 3 5 9.5v12.4C5 33.3 12.3 42 22 45c9.7-3 17-11.7 17-23.1V9.5L22 3Z"
            fill="none"
            stroke={mark}
            strokeWidth={2.4}
            strokeLinejoin="round"
          />
          <Path
            d="m15 24 5 5 9-10"
            fill="none"
            stroke={mark}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
      <View style={{ gap: 14 }}>
        {copy.items.map((tip, i) => (
          <Animated.View
            key={tip.title}
            entering={enterRise(60 * i)}
            accessible
            accessibilityLabel={`${tip.title}. ${tip.body}`}
            style={{ borderRadius: 14, padding: 18, gap: 6, backgroundColor: theme.surfaceMuted }}
          >
            <Text variant="labelMd" style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
              {tip.title}
            </Text>
            <Text variant="bodySm" tone="muted">
              {tip.body}
            </Text>
          </Animated.View>
        ))}
      </View>
    </SettingsFrame>
  );
}
