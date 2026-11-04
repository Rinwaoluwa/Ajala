import { View } from 'react-native';

import { SvgIcon, Text } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

/** The TRAVEL tag on a city for a Travel Pro member (Figma "City picker / Pro"): the globe on mint. */
export function TravelTag() {
  const theme = useTheme();
  return (
    <View
      className="flex-row items-center"
      style={{
        gap: 3,
        backgroundColor: theme.selectedFill,
        borderRadius: 999,
        paddingHorizontal: 6,
        paddingVertical: 2,
      }}
      accessibilityLabel="Travel"
    >
      <SvgIcon name="earth" size={11} />
      <Text variant="bodyXs" style={{ color: theme.selectedForeground, fontSize: 11, lineHeight: 14 }}>
        TRAVEL
      </Text>
    </View>
  );
}
