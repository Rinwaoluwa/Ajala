import { useColorScheme } from 'react-native';

import { palette } from './tokens/colors';

/**
 * Each post type's colour, so a type looks the same wherever it appears: the
 * home feed's pills (All, Meetups, Events, Plans, Groups) and the type tag on
 * a post's card, mini card and page.
 *
 *   - `fill` and `label`: the chosen pill, solid.
 *   - `soft` and `softLabel`: everything else, a pale wash of the colour with a
 *     deep label (a pill not chosen, a type tag).
 *   - `tag`: the wash made solid, for a tag over a photo. On light it is the
 *     wash itself; on dark the see-through wash is flattened onto Night, so the
 *     tag reads the same as its pill without a photo showing through it.
 *
 * Teal for All, coral for Meetups, Marigold for Events, indigo for Plans and
 * green for Groups. Events take an ink label on Marigold, where white would be
 * unreadable.
 */
export type TypeColorKey = 'all' | 'meetup' | 'event' | 'plan' | 'group';
export type TypeColor = { fill: string; label: string; soft: string; softLabel: string; tag: string };

const INDIGO = '#5C5CF6';

/** `#RRGGBBAA` laid over a solid colour, as one solid `#RRGGBB`. */
function flatten(hexWithAlpha: string, base: string): string {
  const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const alpha = hexWithAlpha.length === 9 ? ch(hexWithAlpha, 3) / 255 : 1;
  const mixed = [0, 1, 2].map((i) => Math.round(ch(hexWithAlpha, i) * alpha + ch(base, i) * (1 - alpha)));
  return `#${mixed.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

const withTag = (c: Omit<TypeColor, 'tag'>, base: string | null): TypeColor => ({
  ...c,
  tag: base ? flatten(c.soft, base) : c.soft,
});

const LIGHT: Record<TypeColorKey, TypeColor> = {
  all: withTag({ fill: palette.teal, label: palette.white, soft: '#E1F2EF', softLabel: palette.tealDark }, null),
  meetup: withTag({ fill: palette.coral, label: palette.white, soft: '#FBE7E2', softLabel: '#9A3320' }, null),
  event: withTag({ fill: palette.marigold, label: palette.ink, soft: '#FCF1D9', softLabel: '#7A5200' }, null),
  plan: withTag({ fill: INDIGO, label: palette.white, soft: '#EBEAFD', softLabel: '#3B3BB8' }, null),
  group: withTag({ fill: palette.success, label: palette.white, soft: '#E2F3E7', softLabel: '#0F5E2C' }, null),
};

const DARK: Record<TypeColorKey, TypeColor> = {
  all: withTag({ fill: palette.teal, label: palette.white, soft: '#0E6F6940', softLabel: '#7FD9CE' }, palette.night),
  meetup: withTag({ fill: palette.coral, label: palette.white, soft: '#CC4A3040', softLabel: '#FFB4A2' }, palette.night),
  event: withTag({ fill: palette.marigold, label: palette.ink, soft: '#F5B83D33', softLabel: '#FFD98A' }, palette.night),
  plan: withTag({ fill: INDIGO, label: palette.white, soft: '#5C5CF640', softLabel: '#C2C2FF' }, palette.night),
  group: withTag({ fill: palette.success, label: palette.white, soft: '#15803D40', softLabel: '#8FE0A9' }, palette.night),
};

export const typeColors = { light: LIGHT, dark: DARK } as const;

/** The type colours for the current scheme. */
export function useTypeColors(): Record<TypeColorKey, TypeColor> {
  return useColorScheme() === 'dark' ? DARK : LIGHT;
}
