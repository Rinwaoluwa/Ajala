import { router } from 'expo-router';

import { lockedPostPaywall } from '@features/payment';
import { SavedActivitiesScreen } from '@features/profile';

/** Saved activities: the posts the person bookmarked. */
export default function SavedRoute() {
  return (
    <SavedActivitiesScreen
      onBack={() => router.back()}
      // A locked card (MOB-077) goes straight to the paywall, without asking for the post.
      onOpenPost={(id, lockReason) =>
        lockReason
          ? router.push(lockedPostPaywall(lockReason))
          : router.push({ pathname: '/(app)/post/[id]', params: { id: id } })
      }
      onExplore={() => router.navigate('/(app)/(tabs)/explore')}
    />
  );
}
