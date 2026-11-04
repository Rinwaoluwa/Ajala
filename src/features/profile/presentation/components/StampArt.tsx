import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';

import { fontFamily, palette } from '@shared/theme';

/**
 * A city's passport stamp (Figma Achievements / Stamps): a coral double-ruled
 * rounded frame set at a slight angle, a sun and a simple skyline with a bridge,
 * the city in heavy caps and the country under it. Drawn in vectors, so any city
 * gets one — no artwork per place.
 */
export function StampArt({ city, country, width }: { city: string; country: string; width: number }) {
  const ink = palette.coral;
  const name = city.toUpperCase();
  // Long names get a smaller size so they stay inside the frame.
  const nameSize = Math.min(46, (260 / Math.max(name.length, 4)) * 1.55);
  return (
    <Svg
      width={width}
      height={width * 0.72}
      viewBox="0 0 320 230"
      accessibilityRole="image"
      accessibilityLabel={`${city}, ${country} stamp`}
    >
      <Rect
        x={18}
        y={20}
        width={284}
        height={190}
        rx={34}
        fill="none"
        stroke={ink}
        strokeWidth={9}
        transform="rotate(-5 160 115)"
      />
      <Rect
        x={32}
        y={34}
        width={256}
        height={162}
        rx={24}
        fill="none"
        stroke={ink}
        strokeWidth={3}
        transform="rotate(-5 160 115)"
      />
      <Circle cx={240} cy={64} r={11} fill={ink} />
      {/* Skyline with a bridge. */}
      <Path
        d="M56 128 V108 H70 V96 H84 V116 H98 V86 H112 V122 H128 M128 122 Q160 70 192 122 M136 122 V100 M160 122 V84 M184 122 V100 M192 122 H206 V98 H220 V112 H236 V92 H250 V128"
        fill="none"
        stroke={ink}
        strokeWidth={4}
        strokeLinejoin="round"
        transform="rotate(-5 160 115)"
      />
      <Path d="M60 132 H254" stroke={ink} strokeWidth={4} transform="rotate(-5 160 115)" />
      <SvgText
        x={160}
        y={172}
        fontSize={nameSize}
        fontFamily={fontFamily.heading.extrabold}
        fill={ink}
        textAnchor="middle"
        letterSpacing={2}
        transform="rotate(-5 160 115)"
      >
        {name}
      </SvgText>
      <SvgText
        x={160}
        y={194}
        fontSize={14}
        fontFamily={fontFamily.heading.bold}
        fill={ink}
        textAnchor="middle"
        letterSpacing={4}
        transform="rotate(-5 160 115)"
      >
        {country.toUpperCase()}
      </SvgText>
      {/* The two four-point sparkles either side. */}
      <Path
        d="M44 150 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 Z"
        fill={ink}
        transform="rotate(-5 160 115)"
      />
      <Path
        d="M272 140 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 Z"
        fill={ink}
        transform="rotate(-5 160 115)"
      />
    </Svg>
  );
}
