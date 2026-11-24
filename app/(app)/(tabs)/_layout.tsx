import { TabRouter, router, withLayoutContext } from 'expo-router';
import {
  createNavigatorFactory,
  useNavigationBuilder,
  type DefaultNavigatorOptions,
  type EventMapBase,
  type ParamListBase,
  type TabActionHelpers,
  type TabNavigationState,
  type TabRouterOptions,
} from 'expo-router/react-navigation';
import { useEffect, useState, type ComponentType, type ReactElement } from 'react';
import { View } from 'react-native';
import { Freeze } from 'react-freeze';

import { CreateSomethingSheet, createPostRoutes, type PostKind } from '@features/create-post';
import { paymentRoutes, useSubscription } from '@features/payment';
import {
  FloatingTabBar,
  LoadingRing,
  SwipePager,
  lastListScrollAt,
  tabReselected,
  type TabItem,
} from '@shared/components';

/** Kinds only Travel Pro may create (product, 10 Nov): the sheet tags them, and the rest get the paywall. */
const PRO_ONLY: readonly PostKind[] = ['plan'];

/**
 * The signed-in app's pages: Home, Explore, Trips and Profile, side by side,
 * with the floating tab bar over them and the round "+" above it on the right,
 * which opens "Create something" rather than a page.
 *
 * Changing page:
 *   - A tab tapped: that page, at once (no slide), as tab bars do.
 *   - A sideways swipe: the pages move with the finger and run on to the next
 *     one when let go (`SwipePager`, and docs/design/page-swipe-motion.md for
 *     the recording it is built from). The tab bar's highlight changes when the
 *     next page shows more than this one, or when the swipe is let go.
 *   - On Explore a drag moves the map, so there a swipe starts only from the
 *     sides of the screen or on the tab bar (`swipeFrom: 'edges'`; the screen
 *     lays `PageSwipeZones` over its map). A sideways drag on the tab bar turns
 *     the page on any page.
 *   - The tab already in front, tapped again: back to its beginning
 *     (`tabReselected`; each page's route passes that on to its screen).
 *
 * Explore has no "+": its foot is the map's own dock and controls, which the
 * button would sit on.
 *
 * This is a navigator of its own (`PagesNavigator`: the router's tab state,
 * `TabRouter`, drawn by `TabPages`) rather than the router's `Tabs`: those show
 * one screen at a time, and a swipe needs the next one too. Built the way the
 * router builds `Tabs`, so its screens are told what any tab screen is told:
 * which of them is in front (`useIsFocused`, `useFocusEffect`), and the rest.
 *
 * Which pages are drawn, and when:
 *   - The page in front and the pages either side of it are drawn and showing,
 *     the neighbours out of sight. A swipe then has the next page there from
 *     its first frame. Kept hidden until a swipe began, a page slid in blank:
 *     showing it waits for JavaScript, and a quick swipe does not.
 *   - A page is first drawn when it is first in front, or ahead of that: about
 *     a second after the page beside it has settled, and only while nobody is
 *     scrolling or swiping, so drawing it never lands in the middle of either.
 *     Swiped to before then, it slides in with the loader on it, never empty.
 *   - Pages further away are frozen (`react-freeze`, what `Tabs` froze every
 *     page out of view with): they keep their place and do no work.
 */

const TABS: readonly TabItem[] = [
  { key: 'index', label: 'Home', icon: 'home' },
  { key: 'explore', label: 'Explore', icon: 'compass' },
  { key: 'trips', label: 'Trips', icon: 'luggage' },
  { key: 'profile', label: 'Profile', icon: 'profile' },
];
/** Pages where a sideways drag is the screen's own (the map): a swipe starts only from their edges. */
const SWIPE_FROM_EDGES: readonly string[] = ['explore'];
/** Pages whose own floating controls take the corner the "+" would. */
const NO_CREATE: readonly string[] = ['explore'];
/** How long a page has been settled, and its lists still, before a page beside it is drawn ahead. */
const QUIET_MS = 1000;

type PagesState = TabNavigationState<ParamListBase>;
type PagesNavigatorProps = DefaultNavigatorOptions<
  ParamListBase,
  string | undefined,
  PagesState,
  object,
  EventMapBase,
  unknown
> &
  TabRouterOptions;

/**
 * The navigator: the router's tab state, with `TabPages` to draw it. What
 * `NavigationContent` wraps is told which page is in front; it has to be
 * rendered here, by the component that builds the state, and nowhere else.
 */
function PagesNavigator({
  id,
  initialRouteName,
  backBehavior,
  children,
  layout,
  screenListeners,
  screenOptions,
  screenLayout,
}: PagesNavigatorProps) {
  const { state, descriptors, navigation, NavigationContent } = useNavigationBuilder<
    PagesState,
    TabRouterOptions,
    TabActionHelpers<ParamListBase>,
    object,
    EventMapBase
  >(TabRouter, {
    id,
    initialRouteName,
    backBehavior,
    children,
    layout,
    screenListeners,
    screenOptions,
    screenLayout,
  });
  return (
    <NavigationContent>
      <TabPages
        state={state}
        descriptors={descriptors}
        // To a page by its place in the row, unless the navigator is already there. It goes by
        // the navigator's own count, not a render's: two swipes can land before one render.
        goTo={(index) => {
          const now = navigation.getState();
          const name = now.routes[index]?.name;
          if (name && now.index !== index) navigation.navigate(name);
        }}
      />
    </NavigationContent>
  );
}

const Pages = withLayoutContext<object, ComponentType<PagesNavigatorProps>, PagesState, EventMapBase>(
  createNavigatorFactory(PagesNavigator)().Navigator,
);

export default function TabsLayout() {
  return (
    <Pages>
      {/* The pages, in the tab bar's order. */}
      <Pages.Screen name="index" />
      <Pages.Screen name="explore" />
      <Pages.Screen name="trips" />
      <Pages.Screen name="profile" />
    </Pages>
  );
}

function TabPages({
  state,
  descriptors,
  goTo,
}: {
  state: PagesState;
  /** Each page's screen, by its route's key. */
  descriptors: Record<string, { render: () => ReactElement }>;
  goTo: (index: number) => void;
}) {
  const routes = state.routes;
  const [creating, setCreating] = useState(false);
  const { isPro } = useSubscription();
  // A swipe has the pages (from the drag taking hold until they are at rest), and the page
  // it is heading for.
  const [swiping, setSwiping] = useState(false);
  const [heading, setHeading] = useState<number | null>(null);

  const front = state.index;
  const frontName = routes[front]?.name ?? 'index';
  const frontKey = routes[front]?.key;
  // The pages drawn so far. The one in front always is.
  const [drawn, setDrawn] = useState<readonly string[]>(() => (frontKey ? [frontKey] : []));
  if (frontKey && !drawn.includes(frontKey)) setDrawn([...drawn, frontKey]);

  // Drawing ahead: a page beside the one in front that has not been drawn yet is drawn once
  // things have been quiet, one at a time. Drawing a screen holds the phone for a moment, and
  // that moment must not be in the middle of a scroll or a swipe.
  const ahead = routes.find((route, i) => Math.abs(i - front) === 1 && !drawn.includes(route.key))?.key ?? null;
  useEffect(() => {
    if (!ahead || swiping) return;
    let timer: ReturnType<typeof setTimeout>;
    const draw = () => {
      const still = Date.now() - lastListScrollAt();
      if (still < QUIET_MS) {
        timer = setTimeout(draw, QUIET_MS - still + 50);
        return;
      }
      setDrawn((now) => (now.includes(ahead) ? now : [...now, ahead]));
    };
    timer = setTimeout(draw, QUIET_MS);
    return () => clearTimeout(timer);
  }, [ahead, swiping]);

  // Where the swipe under way is heading; nothing when none is. `heading` on its own can be
  // left over from a swipe that is done (its last word can arrive after the landing's), so it
  // counts only while a swipe has the pages.
  const towards = swiping && heading !== null && Math.abs(heading - front) <= 1 ? heading : null;

  // Ready: showing, though out of sight. The pages either side of the one in front, and
  // either side of the one a swipe is heading for (so the page after that is there by the
  // time this swipe lands, for one that follows straight on).
  const ready = (i: number) => Math.abs(i - front) <= 1 || (towards !== null && Math.abs(i - towards) <= 1);

  // The tab bar goes by where the swipe is heading, so it changes as the page does.
  const shown = towards ?? front;
  const current = routes[shown]?.name ?? frontName;

  const pages = routes.map((route, i) => ({
    key: route.key,
    swipeFrom: SWIPE_FROM_EDGES.includes(route.name) ? ('edges' as const) : ('anywhere' as const),
    content: drawn.includes(route.key) ? (
      <Freeze freeze={!ready(i)}>{descriptors[route.key]?.render()}</Freeze>
    ) : swiping && Math.abs(i - front) === 1 ? (
      // Swiped to before it could be drawn ahead: the loader the screens themselves start
      // with, so the page that slides in and the screen that takes its place look the same.
      <View className="flex-1 items-center justify-center">
        <LoadingRing size={48} />
      </View>
    ) : null,
  }));

  return (
    <>
      <SwipePager
        pages={pages}
        index={front}
        onSwipeStart={() => {
          setSwiping(true);
          setHeading(null);
        }}
        onHeading={setHeading}
        onLand={(index) => {
          setSwiping(false);
          setHeading(null);
          goTo(index);
        }}
      >
        <FloatingTabBar
          tabs={TABS}
          current={current}
          // The page already in front, tapped again: back to its beginning (the top of the
          // feed, the map on you). Any other: that page.
          onSelect={(key) =>
            key === frontName ? tabReselected(key) : goTo(routes.findIndex((route) => route.name === key))
          }
          onCreate={NO_CREATE.includes(current) ? undefined : () => setCreating(true)}
          createLabel="Create something"
        />
      </SwipePager>
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
