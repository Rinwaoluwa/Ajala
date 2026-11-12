
import { PROFILE_LINK_BASE } from './profileViewCopy';
import { haptics } from '@shared/feedback/haptics';
import { shareLink } from '@shared/utils/shareLink';

/**
 * The link that opens a profile in the app. Always the user id, never the
 * handle: the links host and the app's `/user/[id]` route both expect the id
 * (backend answers D3), and a handle can change. `handle` is kept only so the
 * callers don't have to change.
 */
export const profileLink = (_handle: string | null, id: string) =>
  `${PROFILE_LINK_BASE}${encodeURIComponent(id)}`;

/** The link once, however it is shared (`shareLink`): it used to go in the text and as the url. */
export function shareProfile(name: string, link: string) {
  shareLink(`${name} on Ajala`, link);
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
    haptics.success();
    return true;
  } catch {
    shareProfile(name, link);
    return false;
  }
}
