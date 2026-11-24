import { useCallback, useRef, useState } from 'react';

import { useRsvpNotice } from './useRsvpNotice';

/**
 * "Before you RSVP", as a question a Join button can ask and wait on
 * (`JoinPill`'s `onBeforeRsvp`): yes at once when the notice has been seen on
 * this phone, otherwise the dialog is shown and the answer is what the person
 * chooses there.
 *
 * `dialog` is the `RsvpNoticeDialog`'s props. Render it inside whatever window
 * the Join button is in: a dialog rendered under a sheet cannot open over it.
 */
export function useRsvpGate() {
  const notice = useRsvpNotice();
  const [open, setOpen] = useState(false);
  const answer = useRef<((ok: boolean) => void) | null>(null);

  const beforeRsvp = useCallback(() => {
    if (notice.seen) return Promise.resolve(true);
    return new Promise<boolean>((resolve) => {
      // A second Join tapped while the dialog is up: the first is answered no.
      answer.current?.(false);
      answer.current = resolve;
      setOpen(true);
    });
  }, [notice.seen]);

  const settle = (ok: boolean) => {
    setOpen(false);
    if (ok) notice.acknowledge();
    answer.current?.(ok);
    answer.current = null;
  };

  return {
    beforeRsvp,
    dialog: { isPresented: open, onAccept: () => settle(true), onDismiss: () => settle(false) },
  };
}
