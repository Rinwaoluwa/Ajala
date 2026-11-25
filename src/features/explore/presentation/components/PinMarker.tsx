import { Text as RNText, View } from 'react-native';

import { useTheme } from '@shared/hooks/useTheme';
import { palette, textStyles } from '@shared/theme';

import type { MapPin, PostType } from '../../domain/entities/Explore';
import { typeEmoji, typeLabels } from '../copy';
import { typeColors } from '../typeColors';

/**
 * A post on the map: its type tag above ("Meetup", "Group"…) and a round
 * marker ringed in the type's colour.
 *
 * It says what kind of post it is and no more (product, 25 Nov). The Explore
 * frames also draw the post's title in a white pill under the marker; with
 * several posts close together those pills ran over each other and over the
 * map. The title is on the card that opens when the pin is tapped, and is
 * still read out for the pin (the marker's own label, `ExploreScreen`).
 *
 * The design's marker is the post's photo. Pins carry no image (`MapPinDto` is
 * id, type, place, title and time), so the marker shows the type's glyph instead
 * — fetching every post for its photo would be one request per pin.
 *
 * The map snapshots this view, so it is plain React Native and keeps its text
 * size capped: a pin that grew with the text setting would cover its neighbours.
 *
 * The map sets the middle of this view on the post's place (`MapPin`'s anchor),
 * so the marker has to be its middle: the room the tag takes above it is left
 * empty below it too, with a copy of the tag that is not drawn. Without it the
 * marker would sit a little under where the post is.
 */

const SIZE = 44;
const MAX_SCALE = 1.2;
const TAG_GAP = 4;

export function PinMarker({ pin, selected }: { pin: MapPin; selected: boolean }) {
  const theme = useTheme();
  const colour = typeColors(theme)[pin.type];

  return (
    <View style={{ alignItems: 'center', maxWidth: 140 }}>
      <View style={{ marginBottom: TAG_GAP }}>
        <TypeTag type={pin.type} edge={colour.fill} />
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
      {/* Not drawn: as tall as the tag above, so the marker is the middle of the pin. */}
      <View
        style={{ marginTop: TAG_GAP, opacity: 0 }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <TypeTag type={pin.type} edge={colour.fill} />
      </View>
    </View>
  );
}

/** The type's glyph and name on a white pill edged in the type's colour. */
function TypeTag({ type, edge }: { type: PostType; edge: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: edge,
        backgroundColor: palette.white,
      }}
    >
      <RNText maxFontSizeMultiplier={MAX_SCALE} style={{ fontSize: 9 }}>
        {typeEmoji[type]}
      </RNText>
      <RNText
        maxFontSizeMultiplier={MAX_SCALE}
        style={{ fontFamily: textStyles.labelXs.fontFamily, fontSize: 10, color: palette.ink }}
      >
        {typeLabels[type]}
      </RNText>
    </View>
  );
}
