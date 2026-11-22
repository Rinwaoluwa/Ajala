import { useCallback, useEffect, useRef, useState } from 'react';

import { createRepeatGuard } from '@core/input/repeatGuard';

/** How long a control ignores another press after one: longer than a double tap, shorter than a second thought. */
export const PRESS_GAP_MS = 500;

/** When the finger touched, from a press event that says (React Native's own presses do). */
function touchTime(event: unknown): number | undefined {
  const stamp = (event as { nativeEvent?: { timestamp?: unknown } } | null | undefined)?.nativeEvent?.timestamp;
  return typeof stamp === 'number' && Number.isFinite(stamp) ? stamp : undefined;
}

/**
 * A press handler that runs once per tap. A double or triple tap is several
 * presses, and all of them used to run: a screen opened three times, a form
 * sent twice, Back going back two screens.
 *
 * The handler this returns lets one press through and ignores the rest of the
 * burst (`createRepeatGuard`): while what the first press started is still
 * going, for `PRESS_GAP_MS` after, and by when the finger actually touched.
 * That last one matters: the first press usually keeps the app busy opening a
 * screen, and the other presses are handled late, when a timer started at the
 * first one has already run out.
 *
 * The shared buttons use it themselves (`Button`, `BackButton`, `JellyPress`),
 * so most screens need nothing. Use it for a press that opens or sends
 * something from a plain `Pressable`. Not for a control that is meant to be
 * tapped repeatedly (a stepper, a like, a chip that turns on and off).
 *
 * It keeps the same identity across renders and always calls the latest handler.
 */
export function usePressOnce<Args extends unknown[]>(
  onPress: ((...args: Args) => void) | null | undefined,
  gapMs: number = PRESS_GAP_MS,
): (...args: Args) => void {
  const latest = useRef(onPress);
  useEffect(() => {
    latest.current = onPress;
  });
  // One guard for the life of the control.
  const [allow] = useState(() => createRepeatGuard(gapMs));
  return useCallback(
    (...args: Args) => {
      if (!allow('press', touchTime(args[0]))) {
        // In the development log, so an ignored tap can be told from one that never arrived.
        if (__DEV__) console.log('[press] ignored a repeat');
        return;
      }
      latest.current?.(...args);
    },
    [allow],
  );
}
