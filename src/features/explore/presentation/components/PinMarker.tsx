import { Text as RNText, View } from 'react-native';

import { useTheme } from '@shared/hooks/useTheme';
import { palette, textStyles } from '@shared/theme';

import type { MapPin } from '../../domain/entities/Explore';
import { typeEmoji, typeLabels } from '../copy';
import { typeColors } from '../typeColors';

/**
 * A post on the map (Explore frames): its type tag above, a round marker ringed
 * in the type's colour, and the title in a white pill below.
 *
 * The design's marker is the post's photo. Pins carry no image (`MapPinDto` is
 * id, type, place, title and time), so the marker shows the type's glyph instead
 * — fetching every post for its photo would be one request per pin.
 *
 * The map snapshots this view, so it is plain React Native and keeps its text
 * size capped: a pin that grew with the text setting would cover its neighbours.
 */

const SIZE = 44;
const MAX_SCALE = 1.2;

export function PinMarker({ pin, selected }: { pin: MapPin; selected: boolean }) {
  const theme = useTheme();
  const colour = typeColors(theme)[pin.type];

  return (
    <View style={{ alignItems: 'center', maxWidth: 140 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 3,
          paddingHorizontal: 7,
          paddingVertical: 2,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: colour.fill,
          backgroundColor: palette.white,
          marginBottom: 4,
        }}
      >
        <RNText maxFontSizeMultiplier={MAX_SCALE} style={{ fontSize: 9 }}>
          {typeEmoji[pin.type]}
        </RNText>
        <RNText
          maxFontSizeMultiplier={MAX_SCALE}
          style={{ fontFamily: textStyles.labelXs.fontFamily, fontSize: 10, color: palette.ink }}
        >
          {typeLabels[pin.type]}
        </RNText>
      </View>
      <View
        style={{
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          borderWidth: selected ? 4 : 3,
          borderColor: colour.fill,
          backgroundColor: theme.card,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <RNText maxFontSizeMultiplier={MAX_SCALE} style={{ fontSize: 20 }}>
          {typeEmoji[pin.type]}
        </RNText>
      </View>
      <View
        style={{
          marginTop: 4,
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 999,
          backgroundColor: palette.white,
          shadowColor: '#000',
          shadowOpacity: 0.12,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 1 },
          elevation: 2,
        }}
      >
        <RNText
          numberOfLines={1}
          maxFontSizeMultiplier={MAX_SCALE}
          style={{ fontFamily: textStyles.labelXs.fontFamily, fontSize: 11, color: palette.ink }}
        >
          {pin.title}
        </RNText>
      </View>
    </View>
  );
}
