import { View } from 'react-native';

import { Avatar } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

import { TRIP_FACES } from '../../domain/rules/tripRules';
import { useTravellerFaces } from '../hooks/useTravellerFaces';

/**
 * The overlapping faces before "5 travellers" (Figma Trips cards): up to three
 * of the people going, each their photo, or their initial on a soft tint when
 * they have none (`Avatar`).
 *
 * A list card knows how many are going but not who, so the faces are read for
 * the card (`useTravellerFaces`). Until they arrive, and where they may not be
 * read, a soft plain circle holds each place, so the row never changes width.
 */

const TINTS = ['#E9ECEF', '#FCE3D3', '#E8E4FB'] as const;
/** The edge that parts one face from the next, in the card's own colour. */
const EDGE = 2;

export function TravellerDots({ postId, count, size = 28 }: { postId: string; count: number; size?: number }) {
  const theme = useTheme();
  const faces = useTravellerFaces(postId, count > 0);
  const shown = Math.min(count, TRIP_FACES);
  if (shown === 0) return null;
  return (
    <View
      style={{ flexDirection: 'row' }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {TINTS.slice(0, shown).map((tint, i) => {
        const face = faces[i];
        return (
          <View
            key={tint}
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              marginLeft: i === 0 ? 0 : -size * 0.3,
              backgroundColor: tint,
              borderWidth: EDGE,
              borderColor: theme.card,
              overflow: 'hidden',
            }}
          >
            {face ? <Avatar name={face.name} uri={face.avatarUrl} size={size - EDGE * 2} /> : null}
          </View>
        );
      })}
    </View>
  );
}
