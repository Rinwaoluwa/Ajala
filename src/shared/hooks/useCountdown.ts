import { useEffect, useState } from 'react';

/**
 * Whole seconds left until `deadline` (a `Date.now()` timestamp), ticking once a
 * second and stopping at 0. `null` means no countdown.
 *
 * It counts to a moment rather than down from a number, so it stays right when
 * the app is backgrounded mid-countdown: timers pause there, the clock does not.
 */
export function useCountdown(deadline: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (deadline === null) return;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (current >= deadline) clearInterval(timer);
    };
    // Re-read the clock straight away: `now` may date from long before this
    // deadline was set, and would otherwise show too long a wait for a frame.
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [deadline]);

  return deadline === null ? 0 : Math.max(0, Math.ceil((deadline - now) / 1000));
}

/** "0:42", "1:05" — minutes and zero-padded seconds. */
export function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}
