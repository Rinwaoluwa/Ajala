import { palette, type SemanticColors } from '@shared/theme';

import type { PostType } from '../domain/entities/Explore';

/**
 * Each post type's colour on the map — chip, pin ring and tag — as the dark
 * Explore frame draws them: Meetup Marigold, Event indigo. Plan and Group take
 * teal and coral so all four can be told apart on the map. The label on each
 * fill is the one that holds contrast on it (ink on Marigold, white elsewhere).
 */
export function typeColors(theme: SemanticColors): Record<PostType, { fill: string; label: string }> {
  return {
    meetup: { fill: theme.accent, label: theme.accentForeground },
    event: { fill: theme.info, label: palette.white },
    plan: { fill: theme.primaryFill, label: theme.primaryFillForeground },
    group: { fill: palette.coral, label: palette.white },
  };
}
