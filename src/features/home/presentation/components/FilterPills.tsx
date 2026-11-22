import { PillTabs } from '@shared/components';

import type { FeedFilter } from '../../domain/entities/Feed';
import { FEED_FILTERS } from '../../domain/rules/feedRules';

/**
 * The post-type pills under the header (Home design, 22 Nov): All, Events,
 * Meetups, Plans, Groups — the shared `PillTabs`, so Liquid Glass where the
 * phone has it, with a jelly wobble on touch. Before the feed has loaded, they
 * are drawn but inert, as the skeleton frame shows them.
 *
 * Plain pills, as the design draws them: the chosen one teal, the rest pale
 * grey. A type's own colour is on its tag in each post, not here.
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
