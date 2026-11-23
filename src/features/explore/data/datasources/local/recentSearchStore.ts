import AsyncStorage from '@react-native-async-storage/async-storage';

import type { RecentSearchStore } from '../../../domain/repositories/RecentSearchStore';

/** `RecentSearchStore` on the phone's own storage, one key per account. */
const key = (userId: string) => `ajala.explore.recentSearches.${userId}`;

export const recentSearchStore: RecentSearchStore = {
  async list(userId) {
    try {
      const saved: unknown = JSON.parse((await AsyncStorage.getItem(key(userId))) ?? '[]');
      return Array.isArray(saved) ? saved.filter((s): s is string => typeof s === 'string') : [];
    } catch {
      return [];
    }
  },
  async save(userId, searches) {
    try {
      await AsyncStorage.setItem(key(userId), JSON.stringify(searches));
    } catch {
      // Remembered for this visit only.
    }
  },
};
