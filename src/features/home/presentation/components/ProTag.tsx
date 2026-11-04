import { View } from 'react-native';

import { SvgIcon, Text } from '@shared/components';
import { palette } from '@shared/theme';

/** The PRO tag on a Travel city: the gold coin and "PRO" on a pale Marigold pill. */
export function ProTag() {
  return (
    <View
      className="flex-row items-center"
      style={{
        gap: 3,
        backgroundColor: '#FFF4D6',
        borderRadius: 999,
        paddingHorizontal: 6,
        paddingVertical: 2,
      }}
      accessibilityLabel="Pro"
    >
      <SvgIcon name="proCoin" size={11} />
      <Text variant="bodyXs" style={{ color: palette.marigold, fontSize: 11, lineHeight: 14 }}>
        PRO
      </Text>
    </View>
  );
}
