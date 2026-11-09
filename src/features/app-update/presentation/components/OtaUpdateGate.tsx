import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useOtaUpdate } from '../hooks/useOtaUpdate';
import { UpdatingScreen } from '../screens/UpdatingScreen';

/**
 * Wraps the navigator, and covers it with "Updating Ajala" while an
 * over-the-air update installs (see `useOtaUpdate`).
 *
 * An overlay rather than a route, like the forced update: an update can be
 * found on whatever screen the person is on, and the app restarts at the end
 * anyway. The app underneath stays mounted but is hidden from assistive
 * technology and cannot be touched.
 *
 * Mount once, at the root, inside the forced-update gate (a build too old for
 * the API needs the store, which an update cannot replace).
 */
export function OtaUpdateGate({ children }: { children: ReactNode }) {
  const phase = useOtaUpdate();
  const covering = phase !== 'idle';

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{ flex: 1 }}
        accessibilityElementsHidden={covering}
        importantForAccessibility={covering ? 'no-hide-descendants' : 'auto'}
      >
        {children}
      </View>
      {phase !== 'idle' ? <UpdatingScreen phase={phase} /> : null}
    </View>
  );
}
