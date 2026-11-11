import type { IllustrationName } from '@shared/components';

import type { PostKind } from '../domain/postKinds';

/**
 * Each kind's colour art (`assets/icons/colored_*.svg`), as "Create something"
 * draws it. The published sheet shows the same art, so a kind looks the same
 * where it starts and where it ends.
 */
export const KIND_ART: Record<PostKind, { name: IllustrationName; width: number }> = {
  meetup: { name: 'meet', width: 44 },
  event: { name: 'confetti', width: 36 },
  plan: { name: 'calendar', width: 36 },
  group: { name: 'group', width: 42 },
};
