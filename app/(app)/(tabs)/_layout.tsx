import { Tabs, router } from 'expo-router';
import { useState } from 'react';

import { CreateSomethingSheet, createPostRoutes, type PostKind } from '@features/create-post';
import { paymentRoutes, useSubscription } from '@features/payment';
import { FloatingTabBar, tabReselected, type TabItem } from '@shared/components';

/** Kinds only Travel Pro may create (product, 10 Nov): the sheet tags them, and the rest get the paywall. */
const PRO_ONLY: readonly PostKind[] = ['plan'];

/**
 * The signed-in app's tabs: Home, Explore, Trips and Profile in the floating
 * bar, and the round "+" above it on the right, which opens "Create something"
 * rather than a tab.
 *
 * Explore has no "+": its foot is the map's own dock and controls, which the
 * button would sit on.
 *
 * Tapping the tab you are on takes it back to its beginning (`tabReselected`;
 * each tab's route passes that on to its screen).
 */

const TABS: readonly TabItem[] = [
  { key: 'index', label: 'Home', icon: 'home' },
  { key: 'explore', label: 'Explore', icon: 'compass' },
  { key: 'trips', label: 'Trips', icon: 'luggage' },
  { key: 'profile', label: 'Profile', icon: 'profile' },
];
/** Tabs whose own floating controls take the corner the "+" would. */
const NO_CREATE: readonly string[] = ['explore'];

export default function TabsLayout() {
  const [creating, setCreating] = useState(false);
  const { isPro } = useSubscription();

  return (
    <>
      <Tabs
        // No cross-fade between tabs. The fade drives each tab's opacity natively, and
        // on a phone a tab that was detached while a pushed screen covered the tabs
        // (Profile → Saved → back → Home → Profile) could return with its opacity
        // stuck at 0: a blank tab. Instant switching is also how iOS tab bars behave.
        screenOptions={{ headerShown: false }}
        tabBar={({ state, navigation }) => {
          const current = state.routes[state.index]?.name ?? 'index';
          return (
            <FloatingTabBar
              tabs={TABS}
              current={current}
              // The tab already in front, tapped again: back to its beginning (the top of the
              // feed, the map on you). Any other: that tab.
              onSelect={(key) => (key === current ? tabReselected(key) : navigation.navigate(key))}
              onCreate={NO_CREATE.includes(current) ? undefined : () => setCreating(true)}
              createLabel="Create something"
            />
          );
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="explore" />
        <Tabs.Screen name="trips" />
        <Tabs.Screen name="profile" />
      </Tabs>
      <CreateSomethingSheet
        isPresented={creating}
        onDismiss={() => setCreating(false)}
        proOnly={isPro ? [] : PRO_ONLY}
        onChoose={(type) => {
          setCreating(false);
          // A frame later, so the sheet starts closing at once: pushed in the same moment,
          // the whole wizard rendered first and the sheet sat still until it was done.
          requestAnimationFrame(() => {
            if (!isPro && PRO_ONLY.includes(type)) {
              router.push({ pathname: paymentRoutes.travelPaywall, params: { reason: 'plans' } });
              return;
            }
            router.push({ pathname: createPostRoutes.wizard, params: { type } });
          });
        }}
      />
    </>
  );
}
