import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import { useAuthState } from '@features/auth';

import { appLock } from '../../appLockModule';
import { shouldRelock } from '../../domain/appLockRules';
import { AppLockScreen } from '../screens/AppLockScreen';

/**
 * Biometric unlock (Figma "Face ID sign-in", enabled from profile setup): once
 * turned on, the app opens behind its lock screen and needs Face ID — or the
 * phone's fingerprint / face unlock — to show itself.
 *
 * When it locks (`appLockRules`): a cold start with a stored session, or coming
 * back after five minutes in the background. A sign-in made in this launch is
 * not locked. Signing out turns it off: the next person to sign in on this phone
 * chooses for themselves.
 *
 * An overlay over the navigator rather than a route, like the forced update: it
 * has to win over whatever screen a cold start or a deep link lands on, and
 * unlocking must put the person back exactly there. The app beneath stays
 * mounted but hidden from assistive technology and untouchable.
 *
 * Mount once at the root, inside the auth provider and beneath the launch
 * overlay, so the splash still covers it while the app starts.
 */

type AppLockContextValue = {
  /** Turns biometric unlock on after a successful prompt. Resolves with whether it did. */
  enable: (promptMessage: string) => Promise<boolean>;
};

const AppLockContext = createContext<AppLockContextValue | null>(null);

export function AppLockGate({ children }: { children: ReactNode }) {
  const auth = useAuthState();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [locked, setLocked] = useState(false);
  // The first settled auth state: a session that was already there is a restored one.
  const firstStatus = useRef<'signedIn' | 'signedOut' | null>(null);
  const backgroundedAt = useRef<number | null>(null);
  const signedIn = auth.status === 'signedIn';

  // Cold start: once the stored session is known, lock it if unlock is on.
  useEffect(() => {
    if (auth.status === 'loading' || firstStatus.current) return;
    const restored = auth.status === 'signedIn';
    firstStatus.current = auth.status;
    void appLock.preference.isEnabled().then((on) => {
      setEnabled(on);
      if (restored && on) setLocked(true);
    });
  }, [auth.status]);

  // Signed out: forget the choice, and never hold the sign-in screens behind a lock.
  useEffect(() => {
    if (auth.status !== 'signedOut' || !firstStatus.current) return;
    void appLock.preference.setEnabled(false).then(() => {
      setEnabled(false);
      setLocked(false);
    });
  }, [auth.status]);

  // Back from a long while away: lock again.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') backgroundedAt.current = Date.now();
      if (state === 'active') {
        if (signedIn && enabled && shouldRelock(backgroundedAt.current, Date.now())) setLocked(true);
        backgroundedAt.current = null;
      }
    });
    return () => subscription.remove();
  }, [signedIn, enabled]);

  const enable = useCallback(async (promptMessage: string) => {
    if ((await appLock.authenticate(promptMessage)) !== 'success') return false;
    await appLock.preference.setEnabled(true);
    setEnabled(true);
    return true;
  }, []);

  const value = useMemo(() => ({ enable }), [enable]);
  const showLock = locked && signedIn;

  return (
    <AppLockContext.Provider value={value}>
      <View style={{ flex: 1 }}>
        <View
          style={{ flex: 1 }}
          accessibilityElementsHidden={showLock}
          importantForAccessibility={showLock ? 'no-hide-descendants' : 'auto'}
        >
          {children}
        </View>
        {showLock ? (
          <View style={StyleSheet.absoluteFill}>
            <AppLockScreen onUnlocked={() => setLocked(false)} />
          </View>
        ) : null}
      </View>
    </AppLockContext.Provider>
  );
}

/** For the screen that offers biometric unlock (profile setup's "Face ID sign-in"). */
export function useAppLockSetup(): AppLockContextValue {
  const value = useContext(AppLockContext);
  if (!value) throw new Error('useAppLockSetup must be used inside AppLockGate (the root layout).');
  return value;
}
