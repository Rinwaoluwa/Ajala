import { Platform, Share } from 'react-native';

/**
 * Opens the system share sheet for a link with a line about it ("AJALA on
 * Ajala"), handing the link over exactly once.
 *
 * iOS shares `message` and `url` as two separate items: Copy, Messages and
 * most apps take both. A message that already ended with the link therefore
 * pasted it twice. So on iOS the link goes only in `url` (which also gives the
 * rich link preview), and the message is the words alone. Android ignores
 * `url` and shares only the message, so there the link is written into it.
 */
export function shareLink(text: string, link: string): void {
  const content =
    Platform.OS === 'ios' ? { message: text, url: link } : { message: `${text}\n${link}` };
  void Share.share(content).catch(() => undefined);
}
