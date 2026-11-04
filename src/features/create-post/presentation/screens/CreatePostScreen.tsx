import { useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, LoadingRing, Screen, StatusSheet, Text } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER } from '@shared/theme';

import type { CreatePostError } from '../../domain/entities/CreatePostError';
import type { PostKind } from '../../domain/postKinds';
import { createPostErrors, kindCopy, wizardCopy } from '../copy';
import { useCreatePost } from '../hooks/useCreatePost';
import { WizardHeader } from '../components/WizardHeader';
import { BasicsStep } from '../components/steps/BasicsStep';
import { CostStep } from '../components/steps/CostStep';
import { ParticipantsStep } from '../components/steps/ParticipantsStep';
import { ReviewStep } from '../components/steps/ReviewStep';
import { ScheduleStep } from '../components/steps/ScheduleStep';

/**
 * The create wizard (Figma New meetup / event / plan / group activity, light
 * and dark): five steps under one header, Next at the foot, Publish on the
 * review step, then the published or "That didn't go through" sheet.
 *
 * Motion: a step slides in a few points from the side it comes from (forward
 * from the right, back from the left) while fading, 240ms; Reduce Motion keeps
 * only the fade. The page starts again at the top on each step.
 *
 * Leaving: the header's arrow goes back a step, and leaves from the first. A
 * post with unsaved changes asks first — save as a draft, discard, or keep
 * editing — whether the person taps back, swipes back or uses Android's back.
 * Straight after Save draft, with nothing changed since, it just leaves.
 */

const SLIDE_MS = 240;
const SAVED_NOTICE_MS = 2000;

export type CreatePostScreenProps = {
  kind: PostKind;
  /** A saved draft to carry on with (Settings / Drafts → Continue editing). */
  draftId?: string | null;
  onClose: () => void;
  onPublished: (postId: string) => void;
};

export function CreatePostScreen({ kind, draftId = null, onClose, onPublished }: CreatePostScreenProps) {
  const vm = useCreatePost(kind, draftId);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const scroll = useRef<ScrollView>(null);
  const copy = kindCopy[kind];
  const justSaved = useJustSaved(vm.draftSavedAt);

  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [vm.stepIndex]);

  // Back a step, or ask before throwing away a post in progress.
  const published = vm.outcome.kind === 'published';
  // Past the first step, back goes back a step; on the first, it only asks when leaving
  // would lose something — never straight after Save draft with nothing changed since.
  const guard = !published && (vm.stepIndex > 0 || vm.unsavedChanges);
  useEffect(() => {
    // iOS's swipe-back cannot be paused for a question, so it is off while one is needed.
    navigation.setOptions({ gestureEnabled: !guard });
  }, [navigation, guard]);

  usePreventRemove(guard, ({ data }) => {
    if (vm.stepIndex > 0) {
      vm.back();
      return;
    }
    const leave = () => navigation.dispatch(data.action);
    if (!vm.unsavedChanges) {
      leave();
      return;
    }
    Alert.alert(wizardCopy.leave.title(copy.noun), wizardCopy.leave.message, [
      ...(vm.canSaveDraft
        ? [
            {
              text: wizardCopy.leave.save,
              onPress: () =>
                void vm.saveDraft().then((error) => {
                  if (!error) leave();
                  else Alert.alert(wizardCopy.saveDraft, failureMessage(error, copy.noun));
                }),
            },
          ]
        : []),
      { text: wizardCopy.leave.discard, style: 'destructive' as const, onPress: leave },
      { text: wizardCopy.leave.stay, style: 'cancel' as const },
    ]);
  });

  const saveDraft = () =>
    void vm.saveDraft().then((error) => {
      if (error) Alert.alert(wizardCopy.saveDraft, failureMessage(error, copy.noun));
    });

  // The sheet's button and its dismissal both lead on; only the first may.
  const finished = useRef(false);
  const finish = () => {
    if (vm.outcome.kind !== 'published' || finished.current) return;
    finished.current = true;
    onPublished(vm.outcome.postId);
  };

  const entering = (vm.direction > 0 ? FadeInRight : FadeInLeft)
    .duration(SLIDE_MS)
    .reduceMotion(ReduceMotion.System);

  const failed =
    vm.outcome.kind === 'failed' && vm.outcome.error.code !== 'invalid' ? vm.outcome.error : null;

  if (vm.loadingDraft || vm.draftFailed) {
    return (
      <Screen edges={['top']} padded={false}>
        <WizardHeader
          title={copy.header.title}
          subtitle={copy.header.subtitle}
          step={0}
          onBack={onClose}
          onSaveDraft={() => undefined}
          canSaveDraft={false}
          saving={false}
          justSaved={false}
        />
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: SCREEN_GUTTER, gap: 16 }}
        >
          {vm.draftFailed ? (
            <>
              <Text variant="bodySm" tone="muted" className="text-center" accessibilityLiveRegion="polite">
                {wizardCopy.draftLoadFailed}
              </Text>
              <Button label={wizardCopy.publishFailed.action} onPress={vm.retryDraft} />
            </>
          ) : (
            <LoadingRing size={40} accessibilityLabel={wizardCopy.loadingDraft} />
          )}
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top']} padded={false}>
      <WizardHeader
        title={copy.header.title}
        subtitle={copy.header.subtitle}
        step={vm.stepIndex}
        onBack={() => (vm.stepIndex > 0 ? vm.back() : onClose())}
        onSaveDraft={saveDraft}
        canSaveDraft={vm.canSaveDraft}
        saving={vm.savingDraft}
        justSaved={justSaved}
      />

      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: 24,
          paddingBottom: vm.step === 'review' ? Math.max(insets.bottom, 16) + 24 : 32,
        }}
      >
        <Animated.View key={vm.step} entering={entering}>
          {vm.step === 'basics' ? <BasicsStep vm={vm} /> : null}
          {vm.step === 'schedule' ? <ScheduleStep vm={vm} /> : null}
          {vm.step === 'participants' ? <ParticipantsStep vm={vm} /> : null}
          {vm.step === 'cost' ? <CostStep vm={vm} /> : null}
          {vm.step === 'review' ? <ReviewStep vm={vm} /> : null}
        </Animated.View>
      </ScrollView>

      {vm.step === 'review' ? null : (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: theme.border,
            paddingHorizontal: SCREEN_GUTTER,
            paddingTop: 16,
            paddingBottom: Math.max(insets.bottom, 16),
            backgroundColor: theme.background,
          }}
        >
          <Button
            label={vm.locating ? wizardCopy.findingPlace : wizardCopy.next}
            size="lg"
            fullWidth
            onPress={() => void vm.next()}
            disabled={!vm.canContinue && !vm.locating}
            loading={vm.locating}
            testID="create-next"
          />
        </View>
      )}

      <StatusSheet
        isPresented={vm.outcome.kind === 'published'}
        tone="success"
        title={copy.published.title}
        message={copy.published.message}
        actionLabel={copy.published.action}
        onAction={finish}
        onDismiss={finish}
      />
      <StatusSheet
        isPresented={failed !== null}
        tone="error"
        title={wizardCopy.publishFailed.title}
        message={failureMessage(failed, copy.noun)}
        actionLabel={wizardCopy.publishFailed.action}
        onAction={vm.publish}
        onDismiss={vm.clearOutcome}
      />
    </Screen>
  );
}

/** What the error sheet says: the design's line for a dropped connection, the reason otherwise. */
function failureMessage(error: CreatePostError | null, noun: string): string {
  if (!error || error.code === 'network' || error.code === 'unknown') {
    return wizardCopy.publishFailed.message(noun);
  }
  if (error.code === 'eventMonthlyCap' && error.resetsAt) {
    const when = new Date(error.resetsAt);
    if (!Number.isNaN(when.getTime())) {
      const day = when.toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
      return `${createPostErrors.eventMonthlyCap} You can publish another from ${day}.`;
    }
  }
  return createPostErrors[error.code];
}

/** True for a moment after a draft is saved, so the header can say so. */
function useJustSaved(savedAt: number | null): boolean {
  // The save whose notice has run its course.
  const [expired, setExpired] = useState<number | null>(null);
  useEffect(() => {
    if (savedAt === null) return;
    const timer = setTimeout(() => setExpired(savedAt), SAVED_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [savedAt]);
  return savedAt !== null && savedAt !== expired;
}
