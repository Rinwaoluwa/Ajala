import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useRequiredUpdate } from '../hooks/useRequiredUpdate';
import { ForceUpdateScreen } from '../screens/ForceUpdateScreen';

/**
 * Wraps the navigator, and covers it with "Time to update" when this build is
 * older than the API's `minAppVersion`.
 *
 * An overlay rather than a route: the check can land at any moment (it waits on
 * the network, and re-runs on returning to the foreground), on whatever screen
 * the person is on — a deep link into the password reset included — and it
 * must win over all of them. Unmounting the navigator instead would throw away
 * where they were for the dev bypass.
 *
 * The app underneath stays mounted but is hidden from assistive technology and
 * cannot be touched: the screen above fills the window.
 *
 * Mount once, at the root, inside the safe-area provider and beneath the launch
 * overlay (so the splash still covers it while the app starts).
 */
export function ForceUpdateGate({ children }: { children: ReactNode }) {
  const { check, openStore, storeError, bypass } = useRequiredUpdate();
  const blocked = check.required;

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{ flex: 1 }}
        accessibilityElementsHidden={blocked}
        importantForAccessibility={blocked ? 'no-hide-descendants' : 'auto'}
      >
        {children}
      </View>
      {check.required ? (
        <ForceUpdateScreen
          installedVersion={check.installedVersion}
          minimumVersion={check.minimumVersion}
          onUpdate={openStore}
          storeError={storeError}
          onBypass={bypass}
        />
      ) : null}
    </View>
  );
}
