import { useMemo } from 'react';

import { PillTabs } from '@shared/components';
import { useTypeColors } from '@shared/theme/postTypeColors';

import type { FeedFilter } from '../../domain/entities/Feed';
import { FEED_FILTERS } from '../../domain/rules/feedRules';

/**
 * The post-type pills under the header (Figma Home Feed): All, Meetups, Events,
 * Plans, Groups — the shared `PillTabs`, so Liquid Glass where the phone has it,
 * with a jelly wobble on touch. Before the feed has loaded, they are drawn but
 * inert, as the skeleton frame shows them.
 *
 * Each type has its own colour (`useTypeColors`), the same as its tag on a
 * post's card: a pale wash with a deep label, filled when chosen.
 */
export function FilterPills({
  value,
  onChange,
  disabled = false,
}: {
  value: FeedFilter;
  onChange: (filter: FeedFilter) => void;
  disabled?: boolean;
}) {
  const colors = useTypeColors();
  const options = useMemo(() => FEED_FILTERS.map((o) => ({ ...o, color: colors[o.value] })), [colors]);
  return <PillTabs options={options} value={value} onChange={onChange} disabled={disabled} />;
}
