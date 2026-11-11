import { Image } from 'expo-image';
import { View } from 'react-native';

import { useTheme } from '@shared/hooks/useTheme';

import { Text } from '../ui/Text';

/**
 * A person's round photo, or their first initial on a soft tint when they have
 * none (the "M", "T" circles of the invite rows). The tint is picked from the
 * name, so one person always gets the same colour.
 *
 * `ring` draws the white edge avatars have where they overlap (`AvatarStack`).
 * `outline` draws a thin grey edge, as Instagram frames a profile photo, so a
 * pale photo still reads as a circle on the page (the profile's own photo).
 */

const TINTS = ['#FDE2E4', '#E3F4F1', '#FBE7B8', '#E8E6FB', '#DCEBFA'] as const;
const INKS = ['#C2334A', '#0E6F69', '#8A5A00', '#4B44B8', '#235A92'] as const;

export type AvatarProps = {
  name: string;
  uri?: string | null;
  size?: number;
  ring?: boolean;
  outline?: boolean;
};

export function Avatar({ name, uri, size = 40, ring = false, outline = false }: AvatarProps) {
  const theme = useTheme();
  const edge = ring ? 2 : outline ? 1 : 0;
  // Inside the edge, so the photo never paints over it.
  const inner = size - edge * 2;
  const index = [...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % TINTS.length;
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={name}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        backgroundColor: TINTS[index],
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: edge,
        borderColor: ring ? '#FFFFFF' : theme.border,
      }}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: inner, height: inner, borderRadius: inner / 2 }}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <Text
          variant="labelMd"
          maxFontSizeMultiplier={1.2}
          style={{ color: INKS[index], fontSize: Math.round(size * 0.4), lineHeight: Math.round(size * 0.5) }}
        >
          {name.trim().charAt(0).toUpperCase() || '?'}
        </Text>
      )}
    </View>
  );
}

/** Faces in a row, each tucked behind the last ("3 joining"). */
export function AvatarStack({
  people,
  size = 28,
  max = 4,
}: {
  people: readonly { name: string; uri?: string | null }[];
  size?: number;
  max?: number;
}) {
  const shown = people.slice(0, max);
  return (
    <View
      style={{ flexDirection: 'row' }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {shown.map((p, i) => (
        <View key={`${p.name}-${i}`} style={{ marginLeft: i === 0 ? 0 : -size * 0.3 }}>
          <Avatar name={p.name} uri={p.uri} size={size} ring />
        </View>
      ))}
    </View>
  );
}
