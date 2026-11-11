import { requireOptionalNativeModule } from 'expo';
import { Linking } from 'react-native';

/**
 * Opens a web page without leaving the app (the policies, FAQ, a host's
 * website): Safari's view controller on iOS, a Custom Tab on Android, through
 * `expo-web-browser`. The only file that imports it.
 *
 * Read defensively: a development build made before the module was added has
 * no native side for it, and the page then opens in the system browser instead
 * of crashing. Anything that is not a web page (`mailto:`) goes straight to the
 * system, which knows what handles it.
 */

type WebBrowserModule = {
  openBrowserAsync: (url: string, options?: Record<string, unknown>) => Promise<unknown>;
};

function loadWebBrowser(): WebBrowserModule | null {
  // Asked first without throwing: requiring the library on a build without its
  // native side raised an uncaught error that the try/catch below did not stop.
  if (!requireOptionalNativeModule('ExpoWebBrowser')) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-web-browser') as WebBrowserModule;
  } catch {
    return null;
  }
}

const isWebPage = (url: string) => /^https?:\/\//i.test(url);

export async function openInApp(url: string, options?: { tint?: string }): Promise<void> {
  const browser = isWebPage(url) ? loadWebBrowser() : null;
  if (browser) {
    try {
      await browser.openBrowserAsync(url, {
        // The app's own chrome: a teal toolbar on Android, teal controls on iOS.
        toolbarColor: options?.tint,
        controlsColor: options?.tint,
        presentationStyle: 'pageSheet',
        dismissButtonStyle: 'close',
      });
      return;
    } catch {
      // The native side is missing or refused: fall through to the system browser.
    }
  }
  await Linking.openURL(url).catch(() => undefined);
}
