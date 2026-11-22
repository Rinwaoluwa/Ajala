/**
 * Says whether a press (or a request to open a screen) may go ahead, refusing a
 * repeat that comes too soon after the last one. A double or triple tap is
 * several presses 100–300ms apart, and every one of them reaches the handler.
 *
 * Counting the gap from when the handler RUNS is not enough. The first press
 * usually starts heavy work (opening a screen keeps the JavaScript thread busy
 * for hundreds of milliseconds; measured at 370–430ms on a simulator, more on a
 * slow phone), and the other presses wait in line behind it. By the time they
 * run, a plain "within 500ms of the last one" has already passed, and the
 * screen opened two or three times. So the gap is judged three ways, any of
 * which refuses the repeat:
 *
 *   - while the work the first press started is still going (`busy`, until the
 *     thread is next free);
 *   - by the time since then (`windowMs`, counted from when the thread was free);
 *   - by when the finger actually touched, where the press says (`touchAt`, the
 *     event's own timestamp), which no amount of waiting in line changes.
 *
 * A burst counts as one: every refused repeat starts the wait again, so
 * hammering a button does it once, and it answers again `windowMs` after the
 * last press.
 *
 * Only a repeat of the SAME key is refused. A different key always goes ahead
 * and starts its own wait.
 */
export type RepeatGuardOptions = {
  now?: () => number;
  /** Calls back once the JavaScript thread is free again. */
  whenIdle?: (done: () => void) => void;
};

export type RepeatGuard = (key: string, touchAt?: number) => boolean;

export function createRepeatGuard(windowMs: number, options: RepeatGuardOptions = {}): RepeatGuard {
  const now = options.now ?? Date.now;
  const whenIdle = options.whenIdle ?? ((done: () => void) => void setTimeout(done, 0));
  let last: { key: string; at: number; touchAt: number | null; busy: boolean } | null = null;

  return (key, touchAt) => {
    const at = now();
    const previous = last;
    if (previous !== null && previous.key === key) {
      const touchedTooSoon =
        touchAt !== undefined &&
        previous.touchAt !== null &&
        // A clock that went backwards (a restart) says nothing.
        touchAt >= previous.touchAt &&
        touchAt - previous.touchAt < windowMs;
      if (previous.busy || at - previous.at < windowMs || touchedTooSoon) {
        previous.at = at;
        if (touchAt !== undefined) previous.touchAt = touchAt;
        return false;
      }
    }
    const mine = { key, at, touchAt: touchAt ?? null, busy: true };
    last = mine;
    whenIdle(() => {
      mine.busy = false;
      // The wait is counted from here, not from the press: the work is what took the time.
      mine.at = Math.max(mine.at, now());
    });
    return true;
  };
}
