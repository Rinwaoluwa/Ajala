import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SafetyBannerStore } from '../../../domain/repositories/ChatRepository';

const KEY = 'ajala.chat.safetyBannerDismissed';

/**
 * Whether "Keep chats on Ajala" was closed, on this phone. A storage failure
 * shows the banner again — the safe direction for a safety reminder.
 */
export const safetyBannerStore: SafetyBannerStore = {
  async isDismissed() {
    try {
      return (await AsyncStorage.getItem(KEY)) === '1';
    } catch {
      return false;
    }
  },
  async dismiss() {
    try {
      await AsyncStorage.setItem(KEY, '1');
    } catch {
      // Kept closed for this visit only.
    }
  },
};
