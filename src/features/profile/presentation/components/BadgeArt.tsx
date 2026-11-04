import { useId } from 'react';
import Svg, { Circle, Defs, LinearGradient, Path, Polygon, Stop, Text as SvgText } from 'react-native-svg';

import { fontFamily } from '@shared/theme';

import type { BadgeLook } from '../../domain/rules/achievementRules';

/**
 * A badge drawn in vectors (Figma Achievements): a shield or a hexagon with a
 * soft top-lit gradient, a white star at its heart and a Marigold ribbon with
 * its word ("SEEKER"). Not yet earned, it is drawn in greys at lower contrast.
 * Scales to any size without assets.
 */

const TONES: Record<BadgeLook['tone'], [string, string]> = {
  teal: ['#6FDCD2', '#0E6F69'],
  gold: ['#FFE08A', '#E3A11B'],
  purple: ['#CDA2F7', '#7B3FD1'],
  blue: ['#A9D2F7', '#3A78C2'],
  coral: ['#F8B3A1', '#CC4A30'],
  pink: ['#F6BEDD', '#C2508F'],
};
const LOCKED: [string, string] = ['#EEF0F3', '#B5BCC7'];

const SHIELD = 'M50 6 L87 19 V52 C87 77 71 94 50 103 C29 94 13 77 13 52 V19 Z';
const HEXAGON = '50,5 89,27 89,73 50,95 11,73 11,27';
const STAR = '50,30 55.5,42 68,43 58.5,51.5 61.5,64 50,57.5 38.5,64 41.5,51.5 32,43 44.5,42';

export function BadgeArt({
  look,
  size,
  locked = false,
}: {
  look: BadgeLook;
  size: number;
  locked?: boolean;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [top, bottom] = locked ? LOCKED : TONES[look.tone];
  const ribbon = locked ? '#D0D5DD' : '#F2B544';
  const ink = locked ? '#8A93A1' : '#5C3B00';
  return (
    <Svg
      width={size}
      height={size * 1.08}
      viewBox="0 0 100 108"
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Defs>
        <LinearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={top} />
          <Stop offset="1" stopColor={bottom} />
        </LinearGradient>
      </Defs>
      {look.shape === 'shield' ? (
        <Path d={SHIELD} fill={`url(#g${id})`} stroke={bottom} strokeWidth={2} />
      ) : (
        <Polygon points={HEXAGON} fill={`url(#g${id})`} stroke={bottom} strokeWidth={2} />
      )}
      <Circle cx={50} cy={48} r={20} fill="#FFFFFF" opacity={locked ? 0.5 : 0.22} />
      <Polygon points={STAR} fill="#FFFFFF" opacity={locked ? 0.8 : 1} />
      {/* The ribbon: a band with notched tails. */}
      <Polygon points="4,70 14,66 14,84 4,80 8,75" fill={ribbon} opacity={0.85} />
      <Polygon points="96,70 86,66 86,84 96,80 92,75" fill={ribbon} opacity={0.85} />
      <Path d="M12 66 H88 V84 H12 Z" fill={ribbon} />
      <SvgText
        x={50}
        y={78.5}
        fontSize={9}
        fontFamily={fontFamily.heading.extrabold}
        fill={ink}
        textAnchor="middle"
        letterSpacing={0.6}
      >
        {look.ribbon}
      </SvgText>
    </Svg>
  );
}
