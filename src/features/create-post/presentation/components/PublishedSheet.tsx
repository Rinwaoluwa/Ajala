import { Illustration, SuccessSheet } from '@shared/components';

import type { PostKind } from '../../domain/postKinds';
import { KIND_ART } from '../kindArt';

/**
 * "Meetup published!" and its siblings: the shared `SuccessSheet` with the
 * kind's own art in the badge (the same art as its "Create something" card).
 * A new post is celebrated with confetti (`celebrate`); saving changes to a live
 * post uses the same sheet without it.
 */
export function PublishedSheet({
  isPresented,
  kind,
  title,
  message,
  actionLabel,
  onAction,
  celebrate,
}: {
  isPresented: boolean;
  kind: PostKind;
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
  celebrate: boolean;
}) {
  const art = KIND_ART[kind];
  return (
    <SuccessSheet
      isPresented={isPresented}
      art={<Illustration name={art.name} width={art.width} active />}
      title={title}
      message={message}
      actionLabel={actionLabel}
      onAction={onAction}
      celebrate={celebrate}
      testID="status-sheet-action"
    />
  );
}
