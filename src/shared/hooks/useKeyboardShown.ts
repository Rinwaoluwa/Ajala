import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Whether the software keyboard is up. A bar pinned above it (a chat composer,
 * the comment bar) drops its home-indicator padding while it is, so it sits
 * right on the keyboard rather than a gap above it.
 *
 * iOS reports the change as it starts ("will"), so the padding moves with the
 * keyboard; Android only reports it afterwards ("did").
 */
export function useKeyboardShown(): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subs = [
      Keyboard.addListener(show, () => setShown(true)),
      Keyboard.addListener(hide, () => setShown(false)),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);
  return shown;
}
