import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { PillTabs, type PillColor } from '@shared/components';
import { palette } from '@shared/theme';

import type { FeedFilter } from '../../domain/entities/Feed';
import { FEED_FILTERS } from '../../domain/rules/feedRules';

/**
 * The post-type pills under the header (Figma Home Feed): All, Meetups, Events,
 * Plans, Groups — the shared `PillTabs`, so Liquid Glass where the phone has it.
 * Before the feed has loaded, they are drawn but inert, as the skeleton frame
 * shows them.
 *
 * Each type has its own colour so they are told apart at a glance: teal for
 * All, coral for Meetups, indigo for Events, Marigold for Plans and green for
 * Groups. Unchosen, a pill is a pale wash of its colour with a deep label;
 * chosen, it fills. Plans take an ink label on Marigold, where white would be
 * unreadable. On dark, the wash is the colour faintly over Night with a light label.
 */
const LIGHT: Record<FeedFilter, PillColor> = {
  all: { fill: palette.teal, label: palette.white, soft: '#E1F2EF', softLabel: palette.tealDark },
  meetup: { fill: palette.coral, label: palette.white, soft: '#FBE7E2', softLabel: '#9A3320' },
  event: { fill: '#5C5CF6', label: palette.white, soft: '#EBEAFD', softLabel: '#3B3BB8' },
  plan: { fill: palette.marigold, label: palette.ink, soft: '#FCF1D9', softLabel: '#7A5200' },
  group: { fill: palette.success, label: palette.white, soft: '#E2F3E7', softLabel: '#0F5E2C' },
};

const DARK: Record<FeedFilter, PillColor> = {
  all: { fill: palette.teal, label: palette.white, soft: '#0E6F6940', softLabel: '#7FD9CE' },
  meetup: { fill: palette.coral, label: palette.white, soft: '#CC4A3040', softLabel: '#FFB4A2' },
  event: { fill: '#5C5CF6', label: palette.white, soft: '#5C5CF640', softLabel: '#C2C2FF' },
  plan: { fill: palette.marigold, label: palette.ink, soft: '#F5B83D33', softLabel: '#FFD98A' },
  group: { fill: palette.success, label: palette.white, soft: '#15803D40', softLabel: '#8FE0A9' },
};

export function FilterPills({
  value,
  onChange,
  disabled = false,
}: {
  value: FeedFilter;
  onChange: (filter: FeedFilter) => void;
  disabled?: boolean;
}) {
  const dark = useColorScheme() === 'dark';
  const options = useMemo(() => {
    const colors = dark ? DARK : LIGHT;
    return FEED_FILTERS.map((o) => ({ ...o, color: colors[o.value] }));
  }, [dark]);
  return <PillTabs options={options} value={value} onChange={onChange} disabled={disabled} />;
}
