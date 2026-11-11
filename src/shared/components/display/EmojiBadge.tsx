import { View } from 'react-native';

import { palette } from '@shared/theme';

import { Text } from '../ui/Text';

/**
 * An interest's emoji in a small white disc, before its name on a chip (the API
 * has no pictures for interests). Kept out of the chip's label text: an emoji
 * measured as part of the label made Android break "⚽ Sports" over two lines.
 */
const BADGE = 24;

export function EmojiBadge({ emoji }: { emoji: string | null }) {
  return (
    <View
      style={{
        width: BADGE,
        height: BADGE,
        borderRadius: BADGE / 2,
        backgroundColor: palette.white,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text variant="bodyXs" allowFontScaling={false} style={{ fontSize: 14, lineHeight: 18 }}>
        {emoji ?? '✨'}
      </Text>
    </View>
  );
}
