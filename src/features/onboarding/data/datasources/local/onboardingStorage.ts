import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Device-local record of whether the tour has been seen.
 *
 * AsyncStorage is right here: a small non-sensitive flag. Tokens go to
 * expo-secure-store instead; relational data goes to SQLite.
 */

const KEY = 'ajala.onboarding.completed.v1';

export const onboardingStorage = {
  async hasCompleted(): Promise<boolean> {
    try {
      return (await AsyncStorage.getItem(KEY)) === 'true';
    } catch {
      // A storage read can fail on a wiped or restricted device. Showing the tour
      // again is a far better failure than blocking launch.
      return false;
    }
  },

  async markCompleted(): Promise<void> {
    await AsyncStorage.setItem(KEY, 'true');
  },
};
