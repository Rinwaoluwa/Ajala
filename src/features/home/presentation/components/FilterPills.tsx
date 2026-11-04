import { PillTabs } from '@shared/components';

import type { FeedFilter } from '../../domain/entities/Feed';
import { FEED_FILTERS } from '../../domain/rules/feedRules';

/**
 * The post-type pills under the header (Figma Home Feed): All, Meetups, Events,
 * Plans, Groups — the shared `PillTabs`, so Liquid Glass where the phone has it
 * and the design's teal-and-pale pills elsewhere. Before the feed has loaded,
 * they are drawn but inert, as the skeleton frame shows them.
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
  return <PillTabs options={FEED_FILTERS} value={value} onChange={onChange} disabled={disabled} />;
}
