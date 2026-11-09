import { Share } from 'react-native';

import { PROFILE_LINK_BASE } from './profileViewCopy';

/**
 * The link that opens a profile in the app. Always the user id, never the
 * handle: the links host and the app's `/user/[id]` route both expect the id
 * (backend answers D3), and a handle can change. `handle` is kept only so the
 * callers don't have to change.
 */
export const profileLink = (_handle: string | null, id: string) =>
  `${PROFILE_LINK_BASE}${encodeURIComponent(id)}`;

export function shareProfile(name: string, link: string) {
  void Share.share({ message: `${name} on Ajala: ${link}`, url: link }).catch(() => undefined);
}

/**
 * Copies the link. The clipboard is a native module new to this build: until
 * the app is rebuilt it is missing, and the system share sheet (which also
 * offers "Copy") is used instead. Resolves with whether it was copied.
 */
export async function copyProfileLink(name: string, link: string): Promise<boolean> {
  try {
    const Clipboard = (await import('expo-clipboard')) as typeof import('expo-clipboard');
    await Clipboard.setStringAsync(link);
    return true;
  } catch {
    shareProfile(name, link);
    return false;
  }
}
