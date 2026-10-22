import * as squareFlags from 'country-flag-icons/string/1x1';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { flagEmoji } from '@shared/utils/flagEmoji';

import { Text } from '../ui/Text';

/**
 * A country's flag as a disc — the flag artwork itself, cropped round, with a
 * soft shadow (the Teleport badge's home and destination flags). The art is the
 * square set from `country-flag-icons` (MIT). An unknown code falls back to the
 * emoji flag.
 */

const FLAGS = squareFlags as unknown as Record<string, string | undefined>;

export function RoundFlag({ countryCode, size }: { countryCode: string; size: number }) {
  const xml = FLAGS[countryCode.trim().toUpperCase()];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
      }}
      accessible={false}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {xml ? (
          <SvgXml xml={xml} width={size} height={size} preserveAspectRatio="xMidYMid slice" />
        ) : (
          <Text allowFontScaling={false} style={{ fontSize: size * 0.8, lineHeight: size }}>
            {flagEmoji(countryCode)}
          </Text>
        )}
      </View>
    </View>
  );
}
