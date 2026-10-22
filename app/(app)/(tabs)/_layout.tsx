import { Tabs, router } from 'expo-router';
import { useState } from 'react';

import { CreateSomethingSheet, createPostRoutes } from '@features/create-post';
import { FloatingTabBar, type TabItem } from '@shared/components';

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

  return (
    <>
      <Tabs
        screenOptions={{ headerShown: false, animation: 'fade' }}
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
        onChoose={(type) => {
          setCreating(false);
          router.push({ pathname: createPostRoutes.wizard, params: { type } });
        }}
      />
    </>
  );
}
