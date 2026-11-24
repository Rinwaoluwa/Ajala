import AsyncStorage from '@react-native-async-storage/async-storage';

import { POST_LIST_MAX, type PostListStore } from '../../../domain/repositories/PostListStore';

/** `PostListStore` on the phone's own storage, one key per list and account. */
function devicePostList(name: string): PostListStore {
  const key = (userId: string) => `ajala.home.${name}.${userId}`;
  return {
    async list(userId) {
      try {
        const saved: unknown = JSON.parse((await AsyncStorage.getItem(key(userId))) ?? '[]');
        return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : [];
      } catch {
        return [];
      }
    },
    async save(userId, postIds) {
      try {
        // The newest are kept: they are at the end.
        await AsyncStorage.setItem(key(userId), JSON.stringify(postIds.slice(-POST_LIST_MAX)));
      } catch {
        // Remembered for this visit only.
      }
    },
  };
}

/** "Hide post". See the contract for why it lives on the phone. */
export const hiddenPostsStore = devicePostList('hiddenPosts');
