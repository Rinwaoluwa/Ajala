import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { Query } from '@tanstack/react-query';

import { getInstalledAppVersion } from '@core/config/appVersion';
import { currentUpdateId } from '@core/updates/otaUpdates';

/**
 * The query cache, kept on the phone between launches, so a screen opened
 * offline (or before its request answers) draws what it showed last time
 * instead of "didn't load, try again". Each screen still refetches in the
 * background as usual; this only fills the gap until it answers.
 *
 * Kept for a day, written at most once a second, and thrown away whenever the
 * app's version or its over-the-air update changes (`buster`): an old bundle's
 * shapes must never feed a new one. Signing out clears the cache, which clears
 * this too. The query client keeps unused answers as long (`gcTime`), or they
 * would leave memory, and so the saved copy, after ten minutes.
 *
 * Only finished, successful answers are saved, and not those that go stale on
 * their own: chat (its picture links last an hour, and typing is live), a feed
 * card's description, and the create wizard's place lookups.
 */
export const QUERY_CACHE_MAX_AGE_MS = 24 * 60 * 60_000;

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'ajala.query-cache.v1',
  throttleTime: 1000,
});

const NOT_SAVED: readonly (readonly string[])[] = [['chat'], ['home', 'postDescription'], ['createPost']];

export function shouldSaveQuery(query: Pick<Query, 'queryKey' | 'state'>): boolean {
  if (query.state.status !== 'success') return false;
  const key = query.queryKey;
  return !NOT_SAVED.some((prefix) => prefix.every((part, i) => key[i] === part));
}

export const queryPersistOptions = {
  persister: queryPersister,
  maxAge: QUERY_CACHE_MAX_AGE_MS,
  buster: `${getInstalledAppVersion() ?? 'dev'}:${currentUpdateId() ?? 'embedded'}`,
  dehydrateOptions: { shouldDehydrateQuery: shouldSaveQuery },
};
