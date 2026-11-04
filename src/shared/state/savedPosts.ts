import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import type { PostCardModel } from '../components/post/PostCard';

/**
 * Posts the person bookmarked, kept on this phone.
 *
 * The API has no saves yet (API map §12), so the bookmark on a card and the
 * "Saved activities" screen work from this list instead of the server: it
 * survives restarts but not a reinstall, and does not follow the person to
 * another phone. When saves arrive in the API, this becomes a cache of them.
 *
 * Each entry keeps the card as it looked when saved, so the list draws without
 * a request.
 */

const KEY = 'ajala.savedPosts.v1';

export type SavedPost = { post: PostCardModel; savedAt: string };

let saved: SavedPost[] = [];
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

async function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) saved = JSON.parse(raw) as SavedPost[];
  } catch {
    saved = [];
  }
  emit();
}

function persist() {
  void AsyncStorage.setItem(KEY, JSON.stringify(saved)).catch(() => undefined);
}

export const savedPosts = {
  toggle(post: PostCardModel) {
    saved = saved.some((s) => s.post.id === post.id)
      ? saved.filter((s) => s.post.id !== post.id)
      : [{ post, savedAt: new Date().toISOString() }, ...saved];
    emit();
    persist();
  },
  remove(id: string) {
    saved = saved.filter((s) => s.post.id !== id);
    emit();
    persist();
  },
  /** Signing out forgets them, like every other trace of the account. */
  clear() {
    saved = [];
    emit();
    void AsyncStorage.removeItem(KEY).catch(() => undefined);
  },
};

const subscribe = (listener: () => void) => {
  void load();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Every saved post, newest first. */
export function useSavedPosts(): SavedPost[] {
  return useSyncExternalStore(subscribe, () => saved, () => saved);
}

/** Whether one post is saved. */
export function useIsSaved(id: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => saved.some((s) => s.post.id === id),
    () => false,
  );
}
