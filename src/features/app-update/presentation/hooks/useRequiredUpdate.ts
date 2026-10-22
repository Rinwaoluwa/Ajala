import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Linking } from 'react-native';

import { createAppUpdateUseCases } from '../../appUpdateModule';
import type { UpdateCheck } from '../../domain/entities/UpdateCheck';
import { forceUpdateCopy } from '../copy';

/**
 * View model for the forced update: whether this build is too old, and the way
 * to the store.
 *
 * Checked at launch and again whenever the app comes back to the foreground —
 * someone who left for the store and returned without updating is still
 * blocked, and a minimum raised while the app sat in the background (the config
 * is re-read after 5 minutes) takes effect without a restart.
 *
 * Until the first answer the app is NOT blocked: the check needs the network,
 * and holding everyone at a blank screen while it runs would punish the up-to-date
 * majority for the sake of the rare old build.
 *
 * `bypass` exists in development builds only. Dev builds carry app.json's
 * version, which runs behind what a shared dev API may ask for, and a lock with
 * no key would stop all work. Release builds have no way past.
 */
export function useRequiredUpdate() {
  const useCases = useMemo(() => createAppUpdateUseCases(), []);
  const [check, setCheck] = useState<UpdateCheck>({ required: false });
  const [bypassed, setBypassed] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const run = () => {
      void useCases.checkForRequiredUpdate().then((next) => {
        if (active) setCheck(next);
      });
    };
    run();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') run();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [useCases]);

  const storeUrl = check.required ? check.storeUrl : null;
  const openStore = useCallback(() => {
    if (!storeUrl) return;
    setStoreError(null);
    Linking.openURL(storeUrl).catch(() => setStoreError(forceUpdateCopy.storeFailed));
  }, [storeUrl]);

  return {
    check: bypassed ? ({ required: false } as const) : check,
    openStore: storeUrl ? openStore : null,
    storeError,
    bypass: __DEV__ ? () => setBypassed(true) : null,
  };
}
