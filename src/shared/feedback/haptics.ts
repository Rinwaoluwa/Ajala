import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

/**
 * The app's touch feedback, in a handful of meanings, so a feeling always says
 * the same thing wherever it is used:
 *
 *   - `tap`: something answered a touch (a pill or button that wobbles).
 *   - `select`: a choice moved (a tab, an option, a stepper's number, a pin).
 *   - `impact`: a bigger moment begins (the "+", choosing what to create,
 *     lifting a photo to drag it).
 *   - `success`: it worked (published, saved, joined, sent, copied).
 *   - `warning`: look before you go on (a destructive question).
 *   - `error`: it didn't work (a failed publish, a step that isn't complete).
 *
 * Fire-and-forget, never throws, and silent where it can't buzz: builds made
 * before `expo-haptics` was added (11 Nov), and the web. The phone's own
 * "System Haptics" setting is honoured by the OS.
 */

type HapticsModule = typeof import('expo-haptics');

const native: HapticsModule | null = (() => {
  if (Platform.OS === 'web' || !requireOptionalNativeModule('ExpoHaptics')) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-haptics') as HapticsModule;
  } catch {
    return null;
  }
})();

function run(fn: (h: HapticsModule) => Promise<void>): void {
  if (!native) return;
  try {
    void fn(native).catch(() => undefined);
  } catch {
    // A buzz is never worth an error.
  }
}

export const haptics = {
  tap: () => run((h) => h.impactAsync(h.ImpactFeedbackStyle.Light)),
  select: () => run((h) => h.selectionAsync()),
  impact: () => run((h) => h.impactAsync(h.ImpactFeedbackStyle.Medium)),
  success: () => run((h) => h.notificationAsync(h.NotificationFeedbackType.Success)),
  warning: () => run((h) => h.notificationAsync(h.NotificationFeedbackType.Warning)),
  error: () => run((h) => h.notificationAsync(h.NotificationFeedbackType.Error)),
};
