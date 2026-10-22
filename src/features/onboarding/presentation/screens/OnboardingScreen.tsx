import { useCallback, useMemo } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';

import { Pager, PaginationDots, ProgressReveal } from '@shared/components';
import { MAX_TEXT_SCALE, useFontScale } from '@shared/hooks/useFontScale';

import type { OnboardingSlide } from '../../domain/entities/OnboardingSlide';
import { OnboardingActions } from '../components/OnboardingActions';
import { OnboardingSlidePage } from '../components/OnboardingSlidePage';
import { WelcomeBackdrop } from '../components/WelcomeBackdrop';
import { useWelcomeActionsMetrics } from '../components/WelcomeActions';
import { useOnboarding } from '../hooks/useOnboarding';
import type { OnboardingExit } from '../state/OnboardingState';

/**
 * Onboarding — the Figma onboarding frames (light and dark): three illustrated
 * slides, then the welcome page.
 *
 * Only the illustration and its text move. The pager carries each slide's art and
 * copy, and finally the welcome page's swirl, logo and tagline. Over the foot of
 * the screen sits a fixed action bar (`OnboardingActions`): Skip / Next on the
 * slides, giving way to Sign up / Sign in as the welcome page slides in. Skip jumps
 * to the welcome page; only Sign up and Sign in leave the tour.
 *
 * The dots also stay put, centred at the foot of the illustration area, and read
 * the pager's live scroll offset so they track the page rather than catching up
 * afterwards. Four dots, as drawn: the welcome page counts. They fade out as it
 * slides in, since it has no illustration for them to sit on.
 *
 * LAYOUT CONTRACT — every row states its own height strategy, because a flex:1
 * child inside a parent that hugs its content resolves to zero height and silently
 * disappears:
 *   - pager:       fills the screen; each slide is illustration (fixed) + copy (flex-1)
 *   - action bar:  absolute at the foot, fixed at the Sign up / Sign in stack height;
 *                  pages reserve that height so their content never sits under it
 */

/** The illustration takes this share of the screen height: 527 of 852 in the design. */
const ILLUSTRATION_HEIGHT_RATIO = 0.62;
/**
 * With the largest text the art gives up room to the copy, down to this share.
 * In between it shrinks in proportion to how far the text has grown.
 */
const MIN_ILLUSTRATION_HEIGHT_RATIO = 0.45;
/** The dots' bottom edge, above the foot of the illustration (measured). */
const DOTS_INSET = 4;
const DOT_SIZE = 8;
/** Between the copy's last line and the action bar. */
const COPY_CLEARANCE = 16;

type Page = { kind: 'slide'; slide: OnboardingSlide } | { kind: 'welcome' };

const keyOf = (page: Page) => (page.kind === 'slide' ? page.slide.id : 'welcome');

export type OnboardingScreenProps = {
  /** How the user left. The route maps the intent to a destination. */
  onExit: (intent: OnboardingExit) => void;
};

export function OnboardingScreen({ onExit }: OnboardingScreenProps) {
  const { height } = useWindowDimensions();
  const { reservedBottom } = useWelcomeActionsMetrics();
  const { state, progress, welcomeIndex, isWelcome, next, skip, signUp, signIn, setIndex } =
    useOnboarding({ onExit });

  const growth = (useFontScale() - 1) / (MAX_TEXT_SCALE - 1);
  const illustrationHeight =
    height *
    (ILLUSTRATION_HEIGHT_RATIO -
      (ILLUSTRATION_HEIGHT_RATIO - MIN_ILLUSTRATION_HEIGHT_RATIO) * growth);

  const pages = useMemo<Page[]>(
    () => [...state.slides.map((slide) => ({ kind: 'slide' as const, slide })), { kind: 'welcome' }],
    [state.slides],
  );

  // 0 on the last slide, 1 on the welcome page: what Sign up / Sign in reveal on.
  const welcomeReveal = useDerivedValue(() => progress.get() - (welcomeIndex - 1));

  const renderPage = useCallback(
    (page: Page, index: number) =>
      page.kind === 'slide' ? (
        <OnboardingSlidePage
          slide={page.slide}
          illustrationHeight={illustrationHeight}
          reservedBottom={reservedBottom + COPY_CLEARANCE}
          active={index === state.index}
        />
      ) : (
        <WelcomeBackdrop reservedBottom={reservedBottom} />
      ),
    [illustrationHeight, reservedBottom, state.index],
  );

  return (
    <View className="flex-1 bg-background">
      <Pager
        pages={pages}
        keyOf={keyOf}
        renderPage={renderPage}
        index={state.index}
        onIndexChange={setIndex}
        progress={progress}
      />

      <ProgressReveal
        progress={progress}
        range={[welcomeIndex - 1, welcomeIndex - 0.5]}
        mode="out"
        rise={0}
        interactive={!isWelcome}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: illustrationHeight - DOTS_INSET - DOT_SIZE,
          alignItems: 'center',
        }}
      >
        <PaginationDots count={pages.length} progress={progress} activeIndex={state.index} />
      </ProgressReveal>

      <OnboardingActions
        progress={progress}
        welcomeReveal={welcomeReveal}
        welcomeIndex={welcomeIndex}
        isWelcome={isWelcome}
        busy={state.isFinishing}
        error={state.error}
        onSkip={skip}
        onNext={next}
        onSignUp={signUp}
        onSignIn={signIn}
      />
    </View>
  );
}
