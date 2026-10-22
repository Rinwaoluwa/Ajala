import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { locationAccess as repo } from '../../locationAccessModule';
import type { LocationAccess } from '../../domain/LocationAccess';

/**
 * The location permission, kept current: read on mount and again whenever the
 * app returns to the foreground — which is how someone comes back from turning it
 * on in Settings, so the screen moves on by itself.
 *
 * `status` is null until the first read lands.
 */
export function useLocationAccess() {
  const [status, setStatus] = useState<LocationAccess | null>(null);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    let active = true;
    const read = () =>
      void repo.current().then((s) => {
        if (active) setStatus(s);
      });
    read();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') read();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const request = useCallback(async () => {
    setRequesting(true);
    try {
      const next = await repo.request();
      setStatus(next);
      return next;
    } finally {
      setRequesting(false);
    }
  }, []);

  return { status, requesting, request, openSettings: repo.openSettings };
}
