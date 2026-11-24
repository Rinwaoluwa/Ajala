import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tabBarTop } from './FloatingTabBar';
import { swipeEdge } from './pageSwipe';

/**
 * For a page that keeps sideways drags for itself (Explore's map): the places
 * a swipe to the next page can still start from. A strip down each side of the
 * screen, and the band at its foot where the tab bar is (`SwipePager` allows a
 * swipe to start there on such a page, and nowhere else).
 *
 * Lay it straight over the map, under the screen's own controls. It draws
 * nothing. What it does is keep the touch from the map: a drag that starts on
 * it turns the page and leaves the map where it is, instead of the two moving
 * together (or the map taking the drag first, so the page never turns).
 *
 * The cost is the map's outer 32 points each side (40 on Android): a pin or a
 * pan cannot be started there. Controls drawn over it work as ever.
 */
export function PageSwipeZones() {
  const insets = useSafeAreaInsets();
  const edge = swipeEdge(Platform.OS === 'ios');
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {/* `collapsable={false}`: a view that draws nothing is otherwise left out, and takes no touches. */}
      <View collapsable={false} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: edge }} />
      <View collapsable={false} style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: edge }} />
      <View
        collapsable={false}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: tabBarTop(insets.bottom) }}
      />
    </View>
  );
}
