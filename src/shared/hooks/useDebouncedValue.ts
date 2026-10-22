import { useEffect, useState } from 'react';

/**
 * `value`, once it has stopped changing for `delayMs`. For keying a query on
 * what someone types: the request goes out when they pause, not per keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return settled;
}
