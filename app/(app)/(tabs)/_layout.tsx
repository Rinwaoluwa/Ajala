import { Tabs, router } from 'expo-router';
import { useState } from 'react';

import { CreateSomethingSheet, createPostRoutes, type PostKind } from '@features/create-post';
import { paymentRoutes, useSubscription } from '@features/payment';
import { FloatingTabBar, type TabItem } from '@shared/components';

/** Kinds only Travel Pro may create (product, 10 Nov): the sheet tags them, and the rest get the paywall. */
const PRO_ONLY: readonly PostKind[] = ['plan'];

/**
 * The signed-in app's tabs: Home, Explore, Trips and Profile in the floating
 * bar, with "+" between them opening "Create something" rather than a tab.
 */

const LEFT: [TabItem, TabItem] = [
  { key: 'index', label: 'Home', icon: 'home' },
  { key: 'explore', label: 'Explore', icon: 'compass' },
];
const RIGHT: [TabItem, TabItem] = [
  { key: 'trips', label: 'Trips', icon: 'luggage' },
  { key: 'profile', label: 'Profile', icon: 'profile' },
];

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
        tabBar={({ state, navigation }) => (
          <FloatingTabBar
            left={LEFT}
            right={RIGHT}
            current={state.routes[state.index]?.name ?? 'index'}
            onSelect={(key) => navigation.navigate(key)}
            onCreate={() => setCreating(true)}
            createLabel="Create something"
          />
        )}
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
          if (!isPro && PRO_ONLY.includes(type)) {
            router.push({ pathname: paymentRoutes.travelPaywall, params: { reason: 'plans' } });
            return;
          }
          router.push({ pathname: createPostRoutes.wizard, params: { type } });
        }}
      />
    </>
  );
}
